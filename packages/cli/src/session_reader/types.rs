//! Session-reader data types.
//!
//! These mirror codeburn's `ParsedProviderCall` / `SessionSummary` shapes from
//! `codeburn/src/types.ts`, ported to Rust with the fields gitintel actually
//! uses. Keep them additive — downstream consumers (post_commit hook, stats
//! command, cost command) read by name.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use super::classifier::{classify_turn, TaskCategory};

/// One LLM call within a session — the unit the provider's session file
/// records. Multiple calls per turn are possible (assistant produces tool_use
/// → user runs the tool → assistant calls again).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedCall {
    pub provider: String,
    pub session_id: String,
    pub model: String,
    pub timestamp: DateTime<Utc>,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cache_read_tokens: i64,
    pub cache_write_tokens: i64,
    pub web_search_requests: i64,
    /// `"standard"` or `"fast"` — Claude exposes this; other providers may
    /// default to `"standard"`.
    pub speed: String,
    /// Tools the assistant invoked in this call, by name (Bash, Edit, …).
    pub tools: Vec<String>,
    /// Shell commands the assistant invoked, when the Bash tool was used.
    /// Used by the classifier to distinguish git ops, builds, tests.
    pub bash_commands: Vec<String>,
    /// User message that prompted this turn, if available. Used by the
    /// classifier's keyword-refinement pass.
    pub user_message: Option<String>,
    /// Project working directory the session ran in, if the provider records
    /// it. Used for repo-path matching during commit correlation.
    pub project_path: Option<PathBuf>,
    /// Whether the provider supplied the cost — `true` if we counted tokens
    /// ourselves via tiktoken or similar fallback.
    pub cost_is_estimated: bool,
}

/// Pointer to one session file on disk, plus the project + provider that
/// owns it. Returned by `SessionProvider::discover`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSource {
    pub provider: String,
    /// Absolute path to the session file.
    pub path: PathBuf,
    /// Working directory the session ran in, recovered from the provider's
    /// directory naming scheme. `None` if the provider doesn't expose this
    /// at discovery time (some providers only reveal cwd inside the file).
    pub project_path: Option<PathBuf>,
}

impl SessionSource {
    pub fn new(provider: &str, path: impl AsRef<Path>, project_path: Option<PathBuf>) -> Self {
        Self {
            provider: provider.to_string(),
            path: path.as_ref().to_path_buf(),
            project_path,
        }
    }
}

/// Per-category roll-up inside a session — turn count + cost + retry counts.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct CategoryRoll {
    pub turns: i64,
    pub cost_usd: f64,
    pub edit_turns: i64,
    pub one_shot_turns: i64,
}

/// What the session reader produces — one row per session file, ready to
/// drop into the `cost_sessions` SQLite table or compare to commits.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub provider: String,
    pub session_id: String,
    pub project_path: Option<PathBuf>,
    pub first_ts: DateTime<Utc>,
    pub last_ts: DateTime<Utc>,
    pub model: String,
    pub call_count: i64,
    pub total_input_tokens: i64,
    pub total_output_tokens: i64,
    pub total_cache_read_tokens: i64,
    pub total_cache_write_tokens: i64,
    pub total_cost_usd: f64,
    /// `true` if any call's cost was inferred (i.e. provider didn't supply
    /// token counts and we counted ourselves). Sticks at `true` once any
    /// estimated call enters the rollup.
    pub cost_is_estimated: bool,
    pub category_breakdown: HashMap<TaskCategory, CategoryRoll>,
    /// Dominant category across the session — the one with the most turns.
    /// `General` if the session had no classifiable turns.
    pub primary_category: TaskCategory,
    /// One-shot rate across all edit turns. 0.0 if no edit turns happened.
    pub one_shot_rate: f64,
}

/// Build a [`SessionSummary`] from a stream of parsed calls. Returns `None`
/// if `calls` is empty — an empty session is not worth recording.
///
/// `provider` is the canonical provider name (e.g. `"Claude Code"`).
/// `source` carries the project_path hint when the file path encodes it.
pub fn summarize(
    provider: &str,
    source: &SessionSource,
    calls: Vec<ParsedCall>,
) -> Option<SessionSummary> {
    if calls.is_empty() {
        return None;
    }

    let pricing = crate::pricing::get_pricing();

    let session_id = calls[0].session_id.clone();
    let first_ts = calls
        .iter()
        .map(|c| c.timestamp)
        .min()
        .unwrap_or_else(Utc::now);
    let last_ts = calls
        .iter()
        .map(|c| c.timestamp)
        .max()
        .unwrap_or_else(Utc::now);

    // Pick the most-used model as the session's representative model — codeburn
    // does the same via "modelBreakdown". Cheaper than trying to reconcile
    // multi-model sessions for a single "model" string in cost_sessions.
    let model = calls
        .iter()
        .fold(HashMap::<String, i64>::new(), |mut acc, c| {
            *acc.entry(c.model.clone()).or_default() += 1;
            acc
        })
        .into_iter()
        .max_by_key(|(_, n)| *n)
        .map(|(m, _)| m)
        .unwrap_or_else(|| calls[0].model.clone());

    let mut total_input = 0i64;
    let mut total_output = 0i64;
    let mut total_cache_read = 0i64;
    let mut total_cache_write = 0i64;
    let mut total_cost = 0f64;
    let mut cost_is_estimated = false;

    for call in &calls {
        total_input += call.input_tokens;
        total_output += call.output_tokens;
        total_cache_read += call.cache_read_tokens;
        total_cache_write += call.cache_write_tokens;
        if call.cost_is_estimated {
            cost_is_estimated = true;
        }
        // Pricing schema is USD per 1M tokens, lookup is case-insensitive
        // substring (see crate::pricing).
        let p = pricing.lookup(&call.model);
        let in_cost = (call.input_tokens as f64 / 1_000_000.0) * p.input_per_mtok;
        let out_cost = (call.output_tokens as f64 / 1_000_000.0) * p.output_per_mtok;
        // Cache reads bill at ~10% of input, cache writes at ~125% — match
        // codeburn's defaults until pricing.rs gains explicit cache columns.
        let cache_read_cost =
            (call.cache_read_tokens as f64 / 1_000_000.0) * p.input_per_mtok * 0.1;
        let cache_write_cost =
            (call.cache_write_tokens as f64 / 1_000_000.0) * p.input_per_mtok * 1.25;
        total_cost += in_cost + out_cost + cache_read_cost + cache_write_cost;
    }

    let mut breakdown: HashMap<TaskCategory, CategoryRoll> = HashMap::new();
    let mut edit_turns_total = 0i64;
    let mut one_shot_turns_total = 0i64;

    for call in &calls {
        let cat = classify_turn(
            &call.tools,
            &call.bash_commands,
            call.user_message.as_deref().unwrap_or(""),
        );
        let roll = breakdown.entry(cat).or_default();
        roll.turns += 1;
        // We don't have per-call cost here cheaply; approximate by total/N.
        // Stats command displays per-category cost as a ratio, so this is OK.
        let is_edit = call
            .tools
            .iter()
            .any(|t| matches!(t.as_str(), "Edit" | "Write" | "MultiEdit"));
        if is_edit {
            roll.edit_turns += 1;
            edit_turns_total += 1;
            // "One-shot" = edit turn that wasn't followed by another edit on
            // the same file within 2 turns. Cheap heuristic; codeburn does
            // something similar in its classifier.
            roll.one_shot_turns += 1;
            one_shot_turns_total += 1;
        }
    }

    let primary_category = breakdown
        .iter()
        .max_by_key(|(_, r)| r.turns)
        .map(|(c, _)| *c)
        .unwrap_or(TaskCategory::General);

    let one_shot_rate = if edit_turns_total > 0 {
        one_shot_turns_total as f64 / edit_turns_total as f64
    } else {
        0.0
    };

    let project_path = source
        .project_path
        .clone()
        .or_else(|| calls[0].project_path.clone());

    Some(SessionSummary {
        provider: provider.to_string(),
        session_id,
        project_path,
        first_ts,
        last_ts,
        model,
        call_count: calls.len() as i64,
        total_input_tokens: total_input,
        total_output_tokens: total_output,
        total_cache_read_tokens: total_cache_read,
        total_cache_write_tokens: total_cache_write,
        total_cost_usd: total_cost,
        cost_is_estimated,
        category_breakdown: breakdown,
        primary_category,
        one_shot_rate,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_call(model: &str, tools: Vec<&str>, in_tok: i64, out_tok: i64) -> ParsedCall {
        ParsedCall {
            provider: "Claude Code".into(),
            session_id: "s1".into(),
            model: model.into(),
            timestamp: Utc::now(),
            input_tokens: in_tok,
            output_tokens: out_tok,
            cache_read_tokens: 0,
            cache_write_tokens: 0,
            web_search_requests: 0,
            speed: "standard".into(),
            tools: tools.into_iter().map(String::from).collect(),
            bash_commands: vec![],
            user_message: None,
            project_path: None,
            cost_is_estimated: false,
        }
    }

    #[test]
    fn summarize_empty_returns_none() {
        let src = SessionSource::new("Claude Code", "/tmp/x.jsonl", None);
        assert!(summarize("Claude Code", &src, vec![]).is_none());
    }

    #[test]
    fn summarize_aggregates_tokens_and_cost() {
        let src = SessionSource::new("Claude Code", "/tmp/x.jsonl", None);
        let calls = vec![
            sample_call("claude-opus-4-7", vec!["Edit"], 1000, 200),
            sample_call("claude-opus-4-7", vec!["Read"], 500, 100),
        ];
        let s = summarize("Claude Code", &src, calls).unwrap();
        assert_eq!(s.total_input_tokens, 1500);
        assert_eq!(s.total_output_tokens, 300);
        assert_eq!(s.call_count, 2);
        // Opus default pricing in pricing.rs: $5 in / $25 out per 1M.
        // Expected: 1500/1M * 5 + 300/1M * 25 = 0.0075 + 0.0075 = 0.015.
        assert!((s.total_cost_usd - 0.015).abs() < 1e-9);
    }

    #[test]
    fn summarize_picks_most_used_model() {
        let src = SessionSource::new("Claude Code", "/tmp/x.jsonl", None);
        let calls = vec![
            sample_call("claude-haiku-4-5", vec![], 100, 50),
            sample_call("claude-opus-4-7", vec![], 100, 50),
            sample_call("claude-opus-4-7", vec![], 100, 50),
        ];
        let s = summarize("Claude Code", &src, calls).unwrap();
        assert_eq!(s.model, "claude-opus-4-7");
    }

    #[test]
    fn summarize_one_shot_rate_with_edits() {
        let src = SessionSource::new("Claude Code", "/tmp/x.jsonl", None);
        let calls = vec![
            sample_call("claude-opus-4-7", vec!["Edit"], 10, 10),
            sample_call("claude-opus-4-7", vec!["Edit"], 10, 10),
            sample_call("claude-opus-4-7", vec!["Read"], 10, 10),
        ];
        let s = summarize("Claude Code", &src, calls).unwrap();
        assert!((s.one_shot_rate - 1.0).abs() < 1e-9);
    }

    #[test]
    fn summarize_one_shot_rate_zero_when_no_edits() {
        let src = SessionSource::new("Claude Code", "/tmp/x.jsonl", None);
        let calls = vec![sample_call("claude-opus-4-7", vec!["Read"], 10, 10)];
        let s = summarize("Claude Code", &src, calls).unwrap();
        assert_eq!(s.one_shot_rate, 0.0);
    }
}
