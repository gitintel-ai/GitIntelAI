//! Core parser for Co-Authored-By trailer detection in git commits
//!
//! Extracts AI tool signatures from commit messages and scans repositories
//! for AI-assisted commits without requiring any setup or installation.

use crate::error::{GitIntelError, Result};
use crate::known_agents;
use regex::Regex;
use serde::Serialize;
use std::process::Command;

/// A matched Co-Authored-By trailer
#[derive(Debug, Clone, Serialize)]
pub struct TrailerMatch {
    /// Canonical agent name (e.g., "Claude Code", "GitHub Copilot")
    pub agent: String,
    /// Raw trailer line from the commit message
    pub raw_trailer: String,
    /// Confidence score (1.0 = email match, 0.9 = name match)
    pub confidence: f64,
}

/// A commit scanned for AI attribution
#[derive(Debug, Clone, Serialize)]
pub struct ScannedCommit {
    /// Full commit SHA
    pub sha: String,
    /// Detected AI agent name
    pub agent: String,
    /// Lines added
    pub insertions: u32,
    /// Lines removed
    pub deletions: u32,
    /// Number of files changed
    pub files_changed: u32,
    /// ISO 8601 timestamp
    pub timestamp: String,
    /// Detection confidence
    pub confidence: f64,
}

/// Parse Co-Authored-By trailers from a commit message and match against known agents.
///
/// Returns all trailers that match a known AI coding tool.
pub fn parse_trailers(commit_message: &str) -> Vec<TrailerMatch> {
    let re = Regex::new(r"(?i)^co-authored-by:\s*(.+)$").expect("valid regex");
    let mut matches = Vec::new();

    for line in commit_message.lines() {
        let line = line.trim();
        if let Some(caps) = re.captures(line) {
            let trailer_value = caps.get(1).map(|m| m.as_str()).unwrap_or("");
            if let Some((agent_name, confidence)) = known_agents::match_agent(trailer_value) {
                matches.push(TrailerMatch {
                    agent: agent_name.to_string(),
                    raw_trailer: line.to_string(),
                    confidence,
                });
            }
        }
    }

    matches
}

/// Scan a git repository for AI-assisted commits using Co-Authored-By trailer detection.
///
/// Uses `git2` for commit message access and falls back to `git log --shortstat` for
/// insertions/deletions since libgit2 doesn't provide shortstat natively.
pub fn scan_repo(
    repo_path: &str,
    since: Option<&str>,
    limit: Option<usize>,
    branch: Option<&str>,
) -> Result<Vec<ScannedCommit>> {
    // First pass: get commit SHAs, messages, and timestamps via git2
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| GitIntelError::Other(format!("Failed to open repository: {e}")))?;

    let mut revwalk = repo.revwalk()
        .map_err(|e| GitIntelError::Other(format!("Failed to create revwalk: {e}")))?;

    // Set starting point
    if let Some(branch_name) = branch {
        let reference = repo.resolve_reference_from_short_name(branch_name)
            .map_err(|e| GitIntelError::Other(format!("Branch '{}' not found: {e}", branch_name)))?;
        let oid = reference.target()
            .ok_or_else(|| GitIntelError::Other(format!("Branch '{}' has no target", branch_name)))?;
        revwalk.push(oid)
            .map_err(|e| GitIntelError::Other(format!("Failed to push to revwalk: {e}")))?;
    } else {
        revwalk.push_head()
            .map_err(|e| GitIntelError::Other(format!("Failed to push HEAD: {e}")))?;
    }

    revwalk.set_sorting(git2::Sort::TIME)
        .map_err(|e| GitIntelError::Other(format!("Failed to set sorting: {e}")))?;

    // Parse the --since date if provided
    let since_epoch = if let Some(since_str) = since {
        parse_since_to_epoch(since_str)?
    } else {
        0
    };

    // Collect commits with AI trailers
    let mut ai_commits: Vec<(String, String, String, f64)> = Vec::new(); // (sha, agent, timestamp, confidence)

    let mut count = 0;
    for oid_result in revwalk {
        let oid = oid_result
            .map_err(|e| GitIntelError::Other(format!("Revwalk error: {e}")))?;

        let commit = repo.find_commit(oid)
            .map_err(|e| GitIntelError::Other(format!("Failed to find commit: {e}")))?;

        // Check time filter
        let commit_time = commit.time().seconds();
        if commit_time < since_epoch {
            break; // Commits are sorted by time, so we can stop
        }

        let message = commit.message().unwrap_or("");
        let trailers = parse_trailers(message);

        if !trailers.is_empty() {
            let sha = oid.to_string();
            let timestamp = chrono::DateTime::from_timestamp(commit_time, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| "unknown".to_string());

            // Use the first (highest priority) trailer match
            let trailer = &trailers[0];
            ai_commits.push((sha, trailer.agent.clone(), timestamp, trailer.confidence));
        }

        count += 1;
        if let Some(max) = limit {
            if count >= max {
                break;
            }
        }
    }

    // Second pass: get shortstat for AI commits via git CLI
    // (git2/libgit2 doesn't have a built-in shortstat equivalent)
    let mut scanned = Vec::with_capacity(ai_commits.len());

    for (sha, agent, timestamp, confidence) in ai_commits {
        let (insertions, deletions, files_changed) = get_shortstat(repo_path, &sha);

        scanned.push(ScannedCommit {
            sha,
            agent,
            insertions,
            deletions,
            files_changed,
            timestamp,
            confidence,
        });
    }

    Ok(scanned)
}

/// Get insertions, deletions, and files changed for a commit via `git log --shortstat`.
fn get_shortstat(repo_path: &str, sha: &str) -> (u32, u32, u32) {
    let output = Command::new("git")
        .args([
            "-C", repo_path,
            "log", "--format=", "--shortstat", "-1", sha,
        ])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            parse_shortstat(&text)
        }
        _ => (0, 0, 0),
    }
}

/// Parse git shortstat output like " 3 files changed, 45 insertions(+), 12 deletions(-)"
fn parse_shortstat(text: &str) -> (u32, u32, u32) {
    let mut insertions = 0u32;
    let mut deletions = 0u32;
    let mut files = 0u32;

    let text = text.trim();
    if text.is_empty() {
        return (0, 0, 0);
    }

    // Match files changed
    let files_re = Regex::new(r"(\d+)\s+files?\s+changed").expect("valid regex");
    if let Some(caps) = files_re.captures(text) {
        files = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
    }

    // Match insertions
    let ins_re = Regex::new(r"(\d+)\s+insertions?\(\+\)").expect("valid regex");
    if let Some(caps) = ins_re.captures(text) {
        insertions = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
    }

    // Match deletions
    let del_re = Regex::new(r"(\d+)\s+deletions?\(-\)").expect("valid regex");
    if let Some(caps) = del_re.captures(text) {
        deletions = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(0);
    }

    (insertions, deletions, files)
}

/// Parse a --since string (e.g., "7d", "30d", "3m", "2024-01-01") to a Unix epoch timestamp.
fn parse_since_to_epoch(since: &str) -> Result<i64> {
    let since = since.trim().to_lowercase();

    // Try relative period
    if let Some(days) = since.strip_suffix('d') {
        let n: i64 = days.parse().map_err(|_| GitIntelError::InvalidTimePeriod(since.clone()))?;
        return Ok((chrono::Utc::now() - chrono::Duration::days(n)).timestamp());
    }

    if let Some(weeks) = since.strip_suffix('w') {
        let n: i64 = weeks.parse().map_err(|_| GitIntelError::InvalidTimePeriod(since.clone()))?;
        return Ok((chrono::Utc::now() - chrono::Duration::weeks(n)).timestamp());
    }

    if let Some(months) = since.strip_suffix('m') {
        let n: i64 = months.parse().map_err(|_| GitIntelError::InvalidTimePeriod(since.clone()))?;
        return Ok((chrono::Utc::now() - chrono::Duration::days(n * 30)).timestamp());
    }

    // Try ISO date
    if let Ok(dt) = chrono::NaiveDate::parse_from_str(&since, "%Y-%m-%d") {
        let datetime = dt.and_hms_opt(0, 0, 0).unwrap();
        return Ok(datetime.and_utc().timestamp());
    }

    Err(GitIntelError::InvalidTimePeriod(since))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_trailers_claude() {
        let msg = "Fix bug in parser\n\nCo-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>";
        let matches = parse_trailers(msg);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].agent, "Claude Code");
        assert_eq!(matches[0].confidence, 1.0);
    }

    #[test]
    fn test_parse_trailers_copilot() {
        let msg = "Add feature\n\nCo-authored-by: GitHub Copilot <copilot@github.com>";
        let matches = parse_trailers(msg);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].agent, "GitHub Copilot");
    }

    #[test]
    fn test_parse_trailers_none() {
        let msg = "Regular commit\n\nSigned-off-by: Dev <dev@example.com>";
        let matches = parse_trailers(msg);
        assert!(matches.is_empty());
    }

    #[test]
    fn test_parse_trailers_multiple() {
        let msg = "Pair coded\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>\nCo-Authored-By: GitHub Copilot <copilot@github.com>";
        let matches = parse_trailers(msg);
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn test_parse_trailers_human_coauthor_no_match() {
        let msg = "Pair programmed\n\nCo-Authored-By: Jane Smith <jane@company.com>";
        let matches = parse_trailers(msg);
        assert!(matches.is_empty(), "Human co-authors should not match");
    }

    #[test]
    fn test_parse_trailers_mixed_human_and_ai() {
        let msg = "Collab commit\n\nCo-Authored-By: Jane Smith <jane@company.com>\nCo-Authored-By: Claude Code <noreply@anthropic.com>\nCo-Authored-By: Bob Dev <bob@dev.io>";
        let matches = parse_trailers(msg);
        assert_eq!(matches.len(), 1, "Only the AI co-author should match");
        assert_eq!(matches[0].agent, "Claude Code");
    }

    #[test]
    fn test_parse_trailers_case_insensitive_key() {
        // Lowercase "co-authored-by"
        let msg = "feat: add thing\n\nco-authored-by: Claude Code <noreply@anthropic.com>";
        let matches = parse_trailers(msg);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].agent, "Claude Code");

        // ALL CAPS
        let msg2 = "feat: add thing\n\nCO-AUTHORED-BY: GitHub Copilot <copilot@github.com>";
        let matches2 = parse_trailers(msg2);
        assert_eq!(matches2.len(), 1);
        assert_eq!(matches2[0].agent, "GitHub Copilot");
    }

    #[test]
    fn test_parse_shortstat() {
        assert_eq!(
            parse_shortstat(" 3 files changed, 45 insertions(+), 12 deletions(-)"),
            (45, 12, 3)
        );
    }

    #[test]
    fn test_parse_shortstat_insertions_only() {
        assert_eq!(
            parse_shortstat(" 1 file changed, 10 insertions(+)"),
            (10, 0, 1)
        );
    }

    #[test]
    fn test_parse_shortstat_deletions_only() {
        assert_eq!(
            parse_shortstat(" 2 files changed, 7 deletions(-)"),
            (0, 7, 2)
        );
    }

    #[test]
    fn test_parse_shortstat_empty() {
        assert_eq!(parse_shortstat(""), (0, 0, 0));
    }

    #[test]
    fn test_parse_shortstat_singular() {
        // "1 file changed, 1 insertion(+), 1 deletion(-)" — singular forms
        assert_eq!(
            parse_shortstat(" 1 file changed, 1 insertion(+), 1 deletion(-)"),
            (1, 1, 1)
        );
    }

    #[test]
    fn test_parse_since_days() {
        let result = parse_since_to_epoch("7d");
        assert!(result.is_ok());
        let epoch = result.unwrap();
        let now = chrono::Utc::now().timestamp();
        // Should be approximately 7 days ago (within a minute tolerance)
        assert!((now - epoch - 7 * 86400).abs() < 60);
    }

    #[test]
    fn test_parse_since_weeks() {
        let result = parse_since_to_epoch("2w");
        assert!(result.is_ok());
        let epoch = result.unwrap();
        let now = chrono::Utc::now().timestamp();
        assert!((now - epoch - 14 * 86400).abs() < 60);
    }

    #[test]
    fn test_parse_since_months() {
        let result = parse_since_to_epoch("3m");
        assert!(result.is_ok());
        let epoch = result.unwrap();
        let now = chrono::Utc::now().timestamp();
        assert!((now - epoch - 90 * 86400).abs() < 60);
    }

    #[test]
    fn test_parse_since_iso_date() {
        let result = parse_since_to_epoch("2024-01-15");
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_since_invalid() {
        let result = parse_since_to_epoch("abc");
        assert!(result.is_err());
    }
}
