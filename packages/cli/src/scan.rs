//! Scan command - detect AI-assisted commits via Co-Authored-By trailers
//!
//! Zero-setup feature: works on any repo without installation by parsing
//! standard git commit trailers.

use crate::error::Result;
use crate::store::Database;
use crate::trailer_detection;
use colored::Colorize;
use serde::Serialize;
use std::collections::HashMap;

/// Summary of a repository scan
#[derive(Debug, Serialize)]
pub struct ScanSummary {
    pub total_commits_scanned: usize,
    pub ai_assisted_commits: usize,
    pub ai_percentage: f64,
    pub total_ai_insertions: u32,
    pub total_ai_deletions: u32,
    pub by_agent: Vec<AgentBreakdown>,
}

/// Per-agent breakdown
#[derive(Debug, Serialize)]
pub struct AgentBreakdown {
    pub agent: String,
    pub commits: usize,
    pub insertions: u32,
    pub deletions: u32,
    pub files_changed: u32,
}

/// Run the scan command
pub async fn run(
    limit: Option<usize>,
    branch: Option<&str>,
    since: Option<&str>,
    format: &str,
) -> Result<()> {
    // Use current directory as repo path
    let repo_path = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());

    // Count total commits for the summary
    let total_scanned = count_commits(&repo_path, since, limit, branch)?;

    // Scan for AI-assisted commits
    let ai_commits = trailer_detection::scan_repo(&repo_path, since, limit, branch)?;

    // Store results in SQLite
    let db = Database::open()?;
    for commit in &ai_commits {
        db.insert_scanned_attribution(
            &commit.sha,
            &commit.agent,
            commit.confidence,
            commit.insertions as i64,
            commit.deletions as i64,
            commit.files_changed as i64,
        )?;
    }

    // Build summary
    let mut agent_map: HashMap<String, AgentBreakdown> = HashMap::new();
    let mut total_insertions = 0u32;
    let mut total_deletions = 0u32;

    for commit in &ai_commits {
        total_insertions += commit.insertions;
        total_deletions += commit.deletions;

        let entry = agent_map.entry(commit.agent.clone()).or_insert(AgentBreakdown {
            agent: commit.agent.clone(),
            commits: 0,
            insertions: 0,
            deletions: 0,
            files_changed: 0,
        });

        entry.commits += 1;
        entry.insertions += commit.insertions;
        entry.deletions += commit.deletions;
        entry.files_changed += commit.files_changed;
    }

    let mut by_agent: Vec<AgentBreakdown> = agent_map.into_values().collect();
    by_agent.sort_by(|a, b| b.commits.cmp(&a.commits));

    let ai_count = ai_commits.len();
    let ai_pct = if total_scanned > 0 {
        (ai_count as f64 / total_scanned as f64) * 100.0
    } else {
        0.0
    };

    let summary = ScanSummary {
        total_commits_scanned: total_scanned,
        ai_assisted_commits: ai_count,
        ai_percentage: ai_pct,
        total_ai_insertions: total_insertions,
        total_ai_deletions: total_deletions,
        by_agent,
    };

    // Output
    match format {
        "json" => {
            println!("{}", serde_json::to_string_pretty(&summary)?);
        }
        _ => {
            print_text_summary(&summary);
        }
    }

    Ok(())
}

/// Count total commits in the range (for computing AI%)
fn count_commits(
    repo_path: &str,
    since: Option<&str>,
    limit: Option<usize>,
    branch: Option<&str>,
) -> Result<usize> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| crate::error::GitIntelError::Other(format!("Failed to open repo: {e}")))?;

    let mut revwalk = repo.revwalk()
        .map_err(|e| crate::error::GitIntelError::Other(format!("Revwalk error: {e}")))?;

    if let Some(branch_name) = branch {
        let reference = repo.resolve_reference_from_short_name(branch_name)
            .map_err(|e| crate::error::GitIntelError::Other(format!("Branch not found: {e}")))?;
        let oid = reference.target()
            .ok_or_else(|| crate::error::GitIntelError::Other("No target".to_string()))?;
        revwalk.push(oid)
            .map_err(|e| crate::error::GitIntelError::Other(format!("Push error: {e}")))?;
    } else {
        revwalk.push_head()
            .map_err(|e| crate::error::GitIntelError::Other(format!("Push HEAD error: {e}")))?;
    }

    revwalk.set_sorting(git2::Sort::TIME)
        .map_err(|e| crate::error::GitIntelError::Other(format!("Sort error: {e}")))?;

    let since_epoch = if let Some(s) = since {
        // Reuse the same parsing logic
        let s = s.trim().to_lowercase();
        if let Some(days) = s.strip_suffix('d') {
            let n: i64 = days.parse().unwrap_or(0);
            (chrono::Utc::now() - chrono::Duration::days(n)).timestamp()
        } else if let Some(weeks) = s.strip_suffix('w') {
            let n: i64 = weeks.parse().unwrap_or(0);
            (chrono::Utc::now() - chrono::Duration::weeks(n)).timestamp()
        } else if let Some(months) = s.strip_suffix('m') {
            let n: i64 = months.parse().unwrap_or(0);
            (chrono::Utc::now() - chrono::Duration::days(n * 30)).timestamp()
        } else {
            0
        }
    } else {
        0
    };

    let mut count = 0;
    for oid_result in revwalk {
        if let Ok(oid) = oid_result {
            if let Ok(commit) = repo.find_commit(oid) {
                if commit.time().seconds() < since_epoch {
                    break;
                }
            }
        }
        count += 1;
        if let Some(max) = limit {
            if count >= max {
                break;
            }
        }
    }

    Ok(count)
}

/// Print scan summary in human-readable format
fn print_text_summary(summary: &ScanSummary) {
    println!("{}", "GitIntel Scan Results".cyan().bold());
    println!("{}", "─".repeat(60));

    println!(
        "Commits scanned:     {}",
        summary.total_commits_scanned.to_string().cyan()
    );
    println!(
        "AI-assisted commits: {} ({:.1}%)",
        summary.ai_assisted_commits.to_string().blue().bold(),
        summary.ai_percentage
    );
    println!(
        "AI insertions:       {} (+)",
        summary.total_ai_insertions.to_string().green()
    );
    println!(
        "AI deletions:        {} (-)",
        summary.total_ai_deletions.to_string().red()
    );

    if !summary.by_agent.is_empty() {
        println!();
        println!("{}", "By Agent:".bold());
        println!("{}", "─".repeat(60));
        println!(
            "{:<25} {:>8} {:>10} {:>10} {:>8}",
            "Agent", "Commits", "Ins(+)", "Del(-)", "Files"
        );

        for agent in &summary.by_agent {
            let pct = if summary.total_commits_scanned > 0 {
                (agent.commits as f64 / summary.total_commits_scanned as f64) * 100.0
            } else {
                0.0
            };

            println!(
                "{:<25} {:>5} ({:>4.1}%) {:>10} {:>10} {:>8}",
                agent.agent.blue(),
                agent.commits,
                pct,
                format!("+{}", agent.insertions).green(),
                format!("-{}", agent.deletions).red(),
                agent.files_changed
            );
        }
    }

    if summary.ai_assisted_commits == 0 {
        println!();
        println!(
            "{}",
            "No AI-assisted commits detected. This repo may not use Co-Authored-By trailers."
                .dimmed()
        );
        println!(
            "{}",
            "Tip: Tools like Claude Code, GitHub Copilot, and Cursor add these automatically."
                .dimmed()
        );
    }

    println!();
    println!(
        "{}",
        format!(
            "Results stored in local database. Run 'gitintel stats' for deeper analysis."
        )
        .dimmed()
    );
}
