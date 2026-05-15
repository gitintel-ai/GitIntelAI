//! Session yield correlator.
//!
//! Given a [`SessionSummary`] and a `git2::Repository`, decide whether the
//! session was [`Productive`], [`Reverted`], or [`Abandoned`]. Ported from
//! codeburn's `src/yield.ts` (`categorizeSession`, lines ~92–170).
//!
//! Matching window: `first_ts` ≤ commit ≤ `last_ts + 1h`. Mirrors codeburn.
//!
//! Revert detection scans commit *bodies* (not just summaries) across the
//! full history for the pattern `This reverts commit <40-hex-sha>` — the
//! string `git revert` writes by default. Once we've built a set of
//! reverted SHAs, a session is Reverted if ≥50% of its main-branch commits
//! land in that set, and Productive otherwise.

use super::types::SessionSummary;
use git2::{Commit, Repository};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum YieldOutcome {
    Productive,
    Reverted,
    Abandoned,
}

impl YieldOutcome {
    pub fn as_str(&self) -> &'static str {
        match self {
            YieldOutcome::Productive => "productive",
            YieldOutcome::Reverted => "reverted",
            YieldOutcome::Abandoned => "abandoned",
        }
    }
}

/// Categorize one session against one repo.
///
/// Returns [`Abandoned`] if the repo has no commits in the session's window
/// on any reachable branch, or if every windowed commit is off the main
/// branch.
pub fn categorize_session(session: &SessionSummary, repo: &Repository) -> YieldOutcome {
    let window_end = session.last_ts + chrono::Duration::hours(1);
    let window_start_secs = session.first_ts.timestamp();
    let window_end_secs = window_end.timestamp();

    // Resolve "main" — try `main` then `master` then HEAD.
    let main_oid = main_branch_oid(repo);
    let main_set: HashSet<git2::Oid> = main_oid
        .map(|oid| {
            let mut set = HashSet::new();
            if let Ok(mut walk) = repo.revwalk() {
                let _ = walk.push(oid);
                for o in walk.flatten() {
                    set.insert(o);
                }
            }
            set
        })
        .unwrap_or_default();

    // Walk the entire commit graph from all refs to find in-window commits.
    // Cheap enough for normal repos; for very large repos, consider passing
    // a since= filter — but git2's revwalk doesn't take time filters, so
    // we filter manually.
    let in_window: Vec<git2::Oid> =
        match collect_commits_in_window(repo, window_start_secs, window_end_secs) {
            Ok(v) => v,
            Err(_) => return YieldOutcome::Abandoned,
        };

    if in_window.is_empty() {
        return YieldOutcome::Abandoned;
    }

    let on_main: Vec<git2::Oid> = in_window
        .iter()
        .copied()
        .filter(|o| main_set.contains(o))
        .collect();

    if on_main.is_empty() {
        return YieldOutcome::Abandoned;
    }

    // Revert detection: scan all commit messages for "This reverts commit <SHA>"
    let reverted = reverted_shas(repo);

    let reverted_count = on_main.iter().filter(|o| reverted.contains(*o)).count();
    let total = on_main.len();
    if reverted_count * 2 >= total {
        YieldOutcome::Reverted
    } else {
        YieldOutcome::Productive
    }
}

fn main_branch_oid(repo: &Repository) -> Option<git2::Oid> {
    for name in &["main", "master"] {
        if let Ok(refname) = repo.find_reference(&format!("refs/heads/{name}")) {
            if let Some(oid) = refname.target() {
                return Some(oid);
            }
        }
    }
    repo.head().ok().and_then(|h| h.target())
}

fn collect_commits_in_window(
    repo: &Repository,
    start_secs: i64,
    end_secs: i64,
) -> Result<Vec<git2::Oid>, git2::Error> {
    let mut walk = repo.revwalk()?;
    // Push every local branch tip; that's enough to reach commits not on
    // main as well. Sidesteps the limitation that revwalk has no time
    // filter.
    let branches = repo.branches(Some(git2::BranchType::Local))?;
    for b in branches.flatten() {
        if let Ok(Some(name)) = b.0.name() {
            let refname = format!("refs/heads/{name}");
            if let Ok(reference) = repo.find_reference(&refname) {
                if let Some(oid) = reference.target() {
                    let _ = walk.push(oid);
                }
            }
        }
    }

    let mut out = Vec::new();
    for oid in walk.flatten() {
        if let Ok(commit) = repo.find_commit(oid) {
            let t = commit.time().seconds();
            if t >= start_secs && t <= end_secs {
                out.push(oid);
            }
        }
    }
    Ok(out)
}

fn reverted_shas(repo: &Repository) -> HashSet<git2::Oid> {
    let mut set = HashSet::new();
    let Ok(mut walk) = repo.revwalk() else {
        return set;
    };
    if walk.push_glob("refs/heads/*").is_err() {
        return set;
    }
    let re = match regex::Regex::new(r"This reverts commit ([0-9a-f]{40})") {
        Ok(r) => r,
        Err(_) => return set,
    };
    for oid in walk.flatten() {
        if let Ok(commit) = repo.find_commit(oid) {
            let msg = commit.message().unwrap_or("");
            for cap in re.captures_iter(msg) {
                if let Ok(reverted) = git2::Oid::from_str(&cap[1]) {
                    set.insert(reverted);
                }
            }
        }
    }
    set
}

#[allow(dead_code)]
fn commit_in_window(commit: &Commit, start_secs: i64, end_secs: i64) -> bool {
    let t = commit.time().seconds();
    t >= start_secs && t <= end_secs
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session_reader::classifier::TaskCategory;
    use chrono::Utc;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::process::Command;
    use tempfile::TempDir;

    fn init_repo(dir: &std::path::Path) -> Repository {
        Command::new("git")
            .args(["init", "-q", "-b", "main"])
            .current_dir(dir)
            .status()
            .expect("git init");
        Command::new("git")
            .args(["config", "user.email", "t@t"])
            .current_dir(dir)
            .status()
            .expect("git config email");
        Command::new("git")
            .args(["config", "user.name", "T"])
            .current_dir(dir)
            .status()
            .expect("git config name");
        Repository::open(dir).expect("open repo")
    }

    fn commit_file(dir: &std::path::Path, name: &str, msg: &str) {
        let p = dir.join(name);
        std::fs::write(&p, name).unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(dir)
            .status()
            .unwrap();
        Command::new("git")
            .args(["commit", "-q", "-m", msg])
            .current_dir(dir)
            .status()
            .unwrap();
    }

    fn session(
        first: chrono::DateTime<Utc>,
        last: chrono::DateTime<Utc>,
        cwd: PathBuf,
    ) -> SessionSummary {
        SessionSummary {
            provider: "Claude Code".into(),
            session_id: "s".into(),
            project_path: Some(cwd),
            first_ts: first,
            last_ts: last,
            model: "claude-opus-4-7".into(),
            call_count: 1,
            total_input_tokens: 1,
            total_output_tokens: 1,
            total_cache_read_tokens: 0,
            total_cache_write_tokens: 0,
            total_cost_usd: 0.0,
            cost_is_estimated: false,
            category_breakdown: HashMap::new(),
            primary_category: TaskCategory::General,
            one_shot_rate: 0.0,
        }
    }

    #[test]
    fn productive_when_main_commit_in_window() {
        let dir = TempDir::new().unwrap();
        let repo = init_repo(dir.path());
        commit_file(dir.path(), "a.txt", "add a");
        let s = session(
            Utc::now() - chrono::Duration::minutes(5),
            Utc::now(),
            dir.path().to_path_buf(),
        );
        assert_eq!(categorize_session(&s, &repo), YieldOutcome::Productive);
    }

    #[test]
    fn abandoned_when_no_commit_in_window() {
        let dir = TempDir::new().unwrap();
        let repo = init_repo(dir.path());
        commit_file(dir.path(), "a.txt", "add a");
        // Session in the future, no commits there.
        let s = session(
            Utc::now() + chrono::Duration::days(1),
            Utc::now() + chrono::Duration::days(1) + chrono::Duration::minutes(5),
            dir.path().to_path_buf(),
        );
        assert_eq!(categorize_session(&s, &repo), YieldOutcome::Abandoned);
    }

    #[test]
    fn reverted_when_majority_of_window_commits_are_reverted() {
        let dir = TempDir::new().unwrap();
        let repo = init_repo(dir.path());
        commit_file(dir.path(), "a.txt", "first");
        // Capture HEAD sha after first commit
        let head = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(dir.path())
            .output()
            .unwrap()
            .stdout;
        let head = String::from_utf8(head).unwrap().trim().to_string();

        let session_start = Utc::now() - chrono::Duration::minutes(5);

        // Commit a revert message later (still within window).
        let revert_msg = format!("Revert \"first\"\n\nThis reverts commit {head}.");
        commit_file(dir.path(), "b.txt", &revert_msg);

        let s = session(session_start, Utc::now(), dir.path().to_path_buf());
        let outcome = categorize_session(&s, &repo);
        // The revert message marks the first commit as reverted. The
        // window contains both commits (first + revert); 1/2 = 50% → Reverted.
        assert_eq!(outcome, YieldOutcome::Reverted);
    }
}
