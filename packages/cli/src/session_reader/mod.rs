//! Session reader — measured cost & yield from raw AI tool session files.
//!
//! Today, attribution cost lands in git notes via `gitintel checkpoint`, which
//! depends on the caller (a hook or wrapper) passing accurate token counts. If
//! the caller doesn't — or there is no caller at all (Cursor, Copilot, most
//! third-party agents) — the cost field is missing or wrong.
//!
//! This module reads the raw session files each AI tool writes to disk
//! (`~/.claude/projects/*/*.jsonl` for Claude Code today; Codex / Cursor /
//! others to follow) and produces a ground-truth [`SessionSummary`] per
//! session. The post-commit hook joins those summaries against commit
//! timestamps and writes the result to the `cost_sessions` SQLite table,
//! marking each row `is_measured = true`. Stats and cost commands then
//! surface measured-vs-estimated splits.
//!
//! ## Local-first
//!
//! Discovery and parsing are pure filesystem reads. No network calls. Pricing
//! lookup uses the table loaded by [`crate::pricing`], which honors the
//! existing user-override → repo-override → built-in precedence chain.
//!
//! ## Attribution standard
//!
//! The `refs/ai/authorship` YAML schema (see `hooks::post_commit::AuthorshipLog`)
//! is the public open standard. This module does NOT modify that schema —
//! measured fields stay in SQLite. Stats join via `(project_path, timestamp)`.

pub mod classifier;
pub mod claude;
pub mod types;
pub mod r#yield;

use crate::error::Result;
use crate::store::{sqlite::CostSession, Database};
use chrono::{DateTime, Utc};
use std::path::Path;

pub use r#yield::categorize_session;
pub use types::{ParsedCall, SessionSource, SessionSummary};

/// Common interface every session-reader provider implements.
///
/// Providers walk a known on-disk layout for their tool, return a list of
/// session source paths, then parse each source into a stream of
/// [`ParsedCall`] records.
pub trait SessionProvider {
    /// Name of the provider — used in stats and as the `agent` field on
    /// `AgentSession` and `CostSession`. Match the existing labels used by
    /// `gitintel checkpoint --agent`, e.g. `"Claude Code"`, `"Codex"`,
    /// `"Cursor"`.
    fn name(&self) -> &'static str;

    /// Discover all session sources for this provider on this machine.
    /// Returns an empty vec if the provider's directory does not exist —
    /// never an error. Missing provider = "not installed", not a failure.
    fn discover(&self) -> Vec<SessionSource>;

    /// Parse a single session source into its constituent calls.
    /// Errors are returned for filesystem / parse failures; the caller
    /// decides whether to skip the source or fail the run.
    fn parse(&self, source: &SessionSource) -> Result<Vec<ParsedCall>>;
}

/// Discover and parse every installed provider's sessions on this machine.
///
/// Errors on individual sources are logged via `tracing` and skipped — one
/// malformed JSONL line should never break a git commit. The returned vec
/// is the union of every readable session summary.
pub fn read_all_sessions() -> Vec<SessionSummary> {
    let providers: Vec<Box<dyn SessionProvider>> = vec![Box::new(claude::ClaudeProvider)];

    let mut summaries = Vec::new();
    for provider in &providers {
        for source in provider.discover() {
            match provider.parse(&source) {
                Ok(calls) => {
                    if let Some(summary) = types::summarize(provider.name(), &source, calls) {
                        summaries.push(summary);
                    }
                }
                Err(e) => {
                    tracing::warn!(
                        provider = provider.name(),
                        path = %source.path.display(),
                        error = %e,
                        "session_reader: skipping unreadable source"
                    );
                }
            }
        }
    }
    summaries
}

/// Return only sessions whose `project_path` is under `repo_path` and whose
/// activity window plausibly contains the given commit timestamp.
///
/// Window: `first_ts` ≤ commit ≤ `last_ts + 1h`. The 1-hour tail mirrors
/// codeburn's yield correlator — commits made shortly after the user stops
/// typing still belong to the session that produced them.
pub fn sessions_for_commit<'a>(
    summaries: &'a [SessionSummary],
    repo_path: &Path,
    commit_ts: chrono::DateTime<chrono::Utc>,
) -> Vec<&'a SessionSummary> {
    summaries
        .iter()
        .filter(|s| {
            s.project_path
                .as_ref()
                .map(|p| path_under(p, repo_path))
                .unwrap_or(false)
        })
        .filter(|s| commit_ts >= s.first_ts && commit_ts <= s.last_ts + chrono::Duration::hours(1))
        .collect()
}

/// Enrich the local `cost_sessions` table for a commit.
///
/// Called from `hooks::post_commit::run` after the AuthorshipLog YAML has
/// been built and written. For every session whose project_path is under
/// `repo_path` and whose `[first_ts, last_ts + 1h]` window contains the
/// commit timestamp, upserts a row in `cost_sessions` marking
/// `is_measured = true` and linking `session_id → commit_sha`. Also runs
/// the yield categorizer if the repo opens cleanly under `git2`.
///
/// Errors on individual sessions are logged and swallowed — this is
/// strictly an enrichment step. It must never block or fail a commit.
/// Returns the number of sessions matched (0 on no match, never an Err).
pub fn enrich_for_commit(
    db: &Database,
    repo_path: &Path,
    commit_sha: &str,
    commit_ts: DateTime<Utc>,
) -> usize {
    let summaries = read_all_sessions();
    let matched: Vec<&SessionSummary> = sessions_for_commit(&summaries, repo_path, commit_ts);

    if matched.is_empty() {
        return 0;
    }

    let repo = git2::Repository::open(repo_path).ok();

    let mut written = 0usize;
    for s in matched {
        let yield_outcome = repo
            .as_ref()
            .map(|r| categorize_session(s, r))
            .map(|o| o.as_str().to_string());

        let row = CostSession {
            session_id: format!("{}::{}", s.provider, s.session_id),
            commit_sha: Some(commit_sha.to_string()),
            agent: s.provider.clone(),
            model: s.model.clone(),
            project_path: s
                .project_path
                .as_ref()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default(),
            started_at: s.first_ts,
            ended_at: Some(s.last_ts),
            tokens_in: s.total_input_tokens,
            tokens_out: s.total_output_tokens,
            tokens_cache: s.total_cache_read_tokens + s.total_cache_write_tokens,
            cost_usd: s.total_cost_usd,
            is_measured: !s.cost_is_estimated,
            measured_cost_usd: Some(s.total_cost_usd),
            category: Some(s.primary_category.as_str().to_string()),
            one_shot_rate: Some(s.one_shot_rate),
            yield_outcome,
        };

        if let Err(e) = db.upsert_cost_session(&row) {
            tracing::warn!(
                provider = %s.provider,
                session_id = %s.session_id,
                error = %e,
                "session_reader: failed to upsert cost_session row"
            );
        } else {
            written += 1;
        }
    }
    written
}

fn path_under(child: &Path, parent: &Path) -> bool {
    // Normalize: drop UNC prefix differences on Windows by going through
    // dunce::canonicalize would be cleaner, but we don't have that dep.
    // For now use case-insensitive prefix match on Windows.
    let child = child
        .to_string_lossy()
        .to_ascii_lowercase()
        .replace('\\', "/");
    let parent = parent
        .to_string_lossy()
        .to_ascii_lowercase()
        .replace('\\', "/");
    let parent = parent.trim_end_matches('/');
    child == parent || child.starts_with(&format!("{parent}/"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn path_under_exact() {
        assert!(path_under(
            &PathBuf::from("/a/b/c"),
            &PathBuf::from("/a/b/c")
        ));
    }

    #[test]
    fn path_under_child() {
        assert!(path_under(
            &PathBuf::from("/a/b/c/d"),
            &PathBuf::from("/a/b/c")
        ));
    }

    #[test]
    fn path_under_sibling_rejected() {
        assert!(!path_under(
            &PathBuf::from("/a/b/cd"),
            &PathBuf::from("/a/b/c")
        ));
    }

    #[test]
    fn path_under_windows_case_and_slash() {
        assert!(path_under(
            &PathBuf::from("C:\\Users\\Aruno\\workspace\\gitintelAI\\packages"),
            &PathBuf::from("C:/users/aruno/WORKSPACE/gitintelai"),
        ));
    }
}
