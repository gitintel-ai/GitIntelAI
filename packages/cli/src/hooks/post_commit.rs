//! Post-commit hook - writes attribution log to git notes

use crate::config::Config;
use crate::error::Result;
use crate::store::{sqlite::Attribution, Database};
use chrono::Utc;
use colored::Colorize;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;

/// Authorship log structure (stored as YAML in git notes)
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthorshipLog {
    pub schema_version: String,
    pub commit: String,
    pub author: String,
    pub timestamp: String,
    pub agent_sessions: Vec<AgentSession>,
    pub summary: Summary,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentSession {
    pub agent: String,
    pub model: String,
    pub tokens: TokenUsage,
    pub cost_usd: f64,
    pub transcript_ref: Option<String>,
    pub files: HashMap<String, FileAttribution>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsage {
    pub input: i64,
    pub output: i64,
    pub cache_read: i64,
    pub cache_write: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileAttribution {
    pub ai_lines: Vec<(i32, i32)>,
    pub human_lines: Vec<(i32, i32)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Summary {
    pub total_lines: i32,
    pub ai_lines: i32,
    pub human_lines: i32,
    pub ai_pct: f64,
    pub total_cost_usd: f64,
}

/// Run post-commit processing
pub async fn run() -> Result<()> {
    let db = Database::open()?;
    let config = Config::load()?;

    // Get current HEAD commit
    let output = Command::new(&config.git_path)
        .args(["rev-parse", "HEAD"])
        .output()?;
    let commit_sha = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Get author email
    let output = Command::new(&config.git_path)
        .args(["log", "-1", "--format=%ae"])
        .output()?;
    let author_email = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Get pending checkpoints
    let checkpoints = db.get_pending_checkpoints()?;

    if checkpoints.is_empty() {
        // No AI attribution for this commit
        return Ok(());
    }

    // Build authorship log
    let mut sessions: HashMap<String, AgentSession> = HashMap::new();
    let mut total_ai_lines = 0i32;
    let mut total_cost = 0.0f64;

    for cp in &checkpoints {
        let session_key = format!("{}:{}", cp.agent, cp.model);

        let session = sessions.entry(session_key).or_insert_with(|| AgentSession {
            agent: cp.agent.clone(),
            model: cp.model.clone(),
            tokens: TokenUsage {
                input: 0,
                output: 0,
                cache_read: 0,
                cache_write: 0,
            },
            cost_usd: 0.0,
            transcript_ref: cp.transcript_ref.clone(),
            files: HashMap::new(),
        });

        session.tokens.input += cp.tokens_in;
        session.tokens.output += cp.tokens_out;
        session.tokens.cache_read += cp.tokens_cache_read;
        session.tokens.cache_write += cp.tokens_cache_write;
        session.cost_usd += cp.cost_usd;
        total_cost += cp.cost_usd;

        let file_attr = session
            .files
            .entry(cp.file_path.clone())
            .or_insert_with(|| FileAttribution {
                ai_lines: Vec::new(),
                human_lines: Vec::new(),
            });

        file_attr.ai_lines.push((cp.line_start, cp.line_end));
    }

    // Merge overlapping ranges per file and compute total AI lines
    for session in sessions.values_mut() {
        for file_attr in session.files.values_mut() {
            file_attr.ai_lines = merge_ranges(&file_attr.ai_lines);
        }
    }
    for session in sessions.values() {
        for file_attr in session.files.values() {
            for &(start, end) in &file_attr.ai_lines {
                total_ai_lines += end - start + 1;
            }
        }
    }

    // Get total lines changed in commit
    // Try HEAD~1..HEAD first; for root commits (no parent), fall back to
    // `diff-tree --shortstat HEAD` which works on the initial commit.
    let output = Command::new(&config.git_path)
        .args(["diff", "--shortstat", "HEAD~1..HEAD"])
        .output()?;
    let diff_stat = String::from_utf8_lossy(&output.stdout);
    let mut total_lines = parse_diff_stat_lines(&diff_stat);

    if total_lines == 0 {
        // Root commit or diff failed — try diff-tree which handles initial commits
        let output2 = Command::new(&config.git_path)
            .args(["diff-tree", "--shortstat", "--root", "HEAD"])
            .output()?;
        let diff_stat2 = String::from_utf8_lossy(&output2.stdout);
        total_lines = parse_diff_stat_lines(&diff_stat2);
    }

    // Ensure total_lines is at least as large as ai_lines (checkpoint ranges
    // may slightly exceed the file length if recorded before final write)
    if total_lines < total_ai_lines {
        total_lines = total_ai_lines;
    }

    let human_lines = total_lines.saturating_sub(total_ai_lines);
    let ai_pct = if total_lines > 0 {
        (total_ai_lines as f64 / total_lines as f64) * 100.0
    } else {
        0.0
    };

    let log = AuthorshipLog {
        schema_version: "gitintel/1.0.0".to_string(),
        commit: commit_sha.clone(),
        author: author_email.clone(),
        timestamp: Utc::now().to_rfc3339(),
        agent_sessions: sessions.into_values().collect(),
        summary: Summary {
            total_lines,
            ai_lines: total_ai_lines,
            human_lines,
            ai_pct,
            total_cost_usd: total_cost,
        },
    };

    // Write to git notes
    let log_yaml = serde_yaml::to_string(&log)?;

    let status = Command::new(&config.git_path)
        .args([
            "notes",
            "--ref=refs/ai/authorship",
            "add",
            "-f",
            "-m",
            &log_yaml,
            &commit_sha,
        ])
        .status()?;

    if !status.success() {
        tracing::warn!("Failed to write git notes");
    }

    // Store in local database
    let attribution = Attribution {
        commit_sha: commit_sha.clone(),
        repo_path: std::env::current_dir()?.to_string_lossy().to_string(),
        author_email,
        authored_at: Utc::now(),
        ai_lines: total_ai_lines,
        human_lines,
        total_lines,
        ai_pct,
        total_cost_usd: total_cost,
        log_json: serde_json::to_string(&log)?,
    };

    db.insert_attribution(&attribution)?;

    // Clear processed checkpoints
    db.clear_checkpoints()?;

    // Print summary
    println!(
        "{} Commit: {}% AI ({}) | {}% Human | Cost: ${:.4}",
        "✓".green(),
        format!("{:.1}", ai_pct).blue(),
        log.agent_sessions
            .first()
            .map(|s| s.agent.as_str())
            .unwrap_or("AI"),
        format!("{:.1}", 100.0 - ai_pct).green(),
        total_cost
    );

    Ok(())
}

fn parse_diff_stat_lines(stat: &str) -> i32 {
    // Parse output like: "3 files changed, 45 insertions(+), 12 deletions(-)"
    let mut total = 0;

    if let Some(ins_match) = stat.find("insertion") {
        let before = &stat[..ins_match];
        if let Some(num_start) = before.rfind(|c: char| !c.is_ascii_digit() && c != ' ') {
            let num_str: String = before[num_start..]
                .chars()
                .filter(|c| c.is_ascii_digit())
                .collect();
            if let Ok(n) = num_str.parse::<i32>() {
                total += n;
            }
        }
    }

    if let Some(del_match) = stat.find("deletion") {
        let before = &stat[..del_match];
        if let Some(num_start) = before.rfind(|c: char| !c.is_ascii_digit() && c != ' ') {
            let num_str: String = before[num_start..]
                .chars()
                .filter(|c| c.is_ascii_digit())
                .collect();
            if let Ok(n) = num_str.parse::<i32>() {
                total += n;
            }
        }
    }

    total
}

/// Merge overlapping or adjacent line ranges and return deduplicated ranges.
///
/// Given a list of (start, end) inclusive ranges, sorts by start and merges
/// any overlapping or adjacent ranges so that no line is counted twice.
pub fn merge_ranges(ranges: &[(i32, i32)]) -> Vec<(i32, i32)> {
    if ranges.is_empty() {
        return Vec::new();
    }

    let mut sorted: Vec<(i32, i32)> = ranges.to_vec();
    sorted.sort_by_key(|&(start, _)| start);

    let mut merged: Vec<(i32, i32)> = vec![sorted[0]];

    for &(start, end) in &sorted[1..] {
        let last = merged.last_mut().unwrap();
        if start <= last.1 + 1 {
            // Overlapping or adjacent — extend
            last.1 = last.1.max(end);
        } else {
            merged.push((start, end));
        }
    }

    merged
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_ranges_no_overlap() {
        let ranges = vec![(1, 10), (20, 30), (40, 50)];
        let merged = merge_ranges(&ranges);
        assert_eq!(merged, vec![(1, 10), (20, 30), (40, 50)]);
    }

    #[test]
    fn test_merge_ranges_full_overlap() {
        // Lines 1-50 then 1-80: should merge to 1-80
        let ranges = vec![(1, 50), (1, 80)];
        let merged = merge_ranges(&ranges);
        assert_eq!(merged, vec![(1, 80)]);
        let total: i32 = merged.iter().map(|(s, e)| e - s + 1).sum();
        assert_eq!(total, 80);
    }

    #[test]
    fn test_merge_ranges_partial_overlap() {
        let ranges = vec![(1, 50), (30, 80)];
        let merged = merge_ranges(&ranges);
        assert_eq!(merged, vec![(1, 80)]);
    }

    #[test]
    fn test_merge_ranges_adjacent() {
        let ranges = vec![(1, 10), (11, 20)];
        let merged = merge_ranges(&ranges);
        assert_eq!(merged, vec![(1, 20)]);
    }

    #[test]
    fn test_merge_ranges_unsorted_input() {
        let ranges = vec![(30, 80), (1, 50)];
        let merged = merge_ranges(&ranges);
        assert_eq!(merged, vec![(1, 80)]);
    }

    #[test]
    fn test_merge_ranges_empty() {
        let ranges: Vec<(i32, i32)> = vec![];
        let merged = merge_ranges(&ranges);
        assert!(merged.is_empty());
    }

    #[test]
    fn test_merge_ranges_single() {
        let ranges = vec![(5, 15)];
        let merged = merge_ranges(&ranges);
        assert_eq!(merged, vec![(5, 15)]);
    }

    #[test]
    fn test_merge_ranges_multiple_overlaps() {
        // Three overlapping ranges
        let ranges = vec![(1, 30), (20, 50), (40, 80)];
        let merged = merge_ranges(&ranges);
        assert_eq!(merged, vec![(1, 80)]);
        let total: i32 = merged.iter().map(|(s, e)| e - s + 1).sum();
        assert_eq!(total, 80);
    }

    #[test]
    fn test_merge_ranges_bug_scenario() {
        // The exact bug scenario: Claude edits lines 1-50, then 1-80
        // Without merging: 50 + 80 = 130 lines (wrong)
        // With merging: 80 lines (correct)
        let ranges = vec![(1, 50), (1, 80)];
        let merged = merge_ranges(&ranges);
        let total: i32 = merged.iter().map(|(s, e)| e - s + 1).sum();
        assert_eq!(total, 80, "Should be 80, not 130");
    }

    // --- parse_diff_stat_lines tests ---

    #[test]
    fn test_parse_diff_stat_full() {
        let stat = " 3 files changed, 45 insertions(+), 12 deletions(-)";
        assert_eq!(parse_diff_stat_lines(stat), 57); // 45 + 12
    }

    #[test]
    fn test_parse_diff_stat_insertions_only() {
        let stat = " 1 file changed, 20 insertions(+)";
        assert_eq!(parse_diff_stat_lines(stat), 20);
    }

    #[test]
    fn test_parse_diff_stat_deletions_only() {
        let stat = " 2 files changed, 5 deletions(-)";
        assert_eq!(parse_diff_stat_lines(stat), 5);
    }

    #[test]
    fn test_parse_diff_stat_empty() {
        assert_eq!(parse_diff_stat_lines(""), 0);
    }

    #[test]
    fn test_parse_diff_stat_singular() {
        let stat = " 1 file changed, 1 insertion(+), 1 deletion(-)";
        assert_eq!(parse_diff_stat_lines(stat), 2);
    }
}
