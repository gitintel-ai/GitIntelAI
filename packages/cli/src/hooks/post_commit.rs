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

        let file_attr = session.files.entry(cp.file_path.clone()).or_insert_with(|| FileAttribution {
            ai_lines: Vec::new(),
            human_lines: Vec::new(),
        });

        file_attr.ai_lines.push((cp.line_start, cp.line_end));
        total_ai_lines += cp.line_end - cp.line_start + 1;
    }

    // Get total lines changed in commit
    let output = Command::new(&config.git_path)
        .args(["diff", "--shortstat", "HEAD~1..HEAD"])
        .output()?;
    let diff_stat = String::from_utf8_lossy(&output.stdout);
    let total_lines = parse_diff_stat_lines(&diff_stat);

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
        .args(["notes", "--ref=refs/ai/authorship", "add", "-f", "-m", &log_yaml, &commit_sha])
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
        log.agent_sessions.first().map(|s| s.agent.as_str()).unwrap_or("AI"),
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
            let num_str: String = before[num_start..].chars().filter(|c| c.is_ascii_digit()).collect();
            if let Ok(n) = num_str.parse::<i32>() {
                total += n;
            }
        }
    }

    if let Some(del_match) = stat.find("deletion") {
        let before = &stat[..del_match];
        if let Some(num_start) = before.rfind(|c: char| !c.is_ascii_digit() && c != ' ') {
            let num_str: String = before[num_start..].chars().filter(|c| c.is_ascii_digit()).collect();
            if let Ok(n) = num_str.parse::<i32>() {
                total += n;
            }
        }
    }

    total
}
