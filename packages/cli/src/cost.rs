//! Cost tracking command - show development costs

use crate::config::Config;
use crate::error::{GitIntelError, Result};
use crate::hooks::post_commit::AuthorshipLog;
use crate::store::Database;
use chrono::{Duration, Utc};
use colored::Colorize;
use serde::Serialize;
use std::collections::HashMap;
use std::process::Command;

/// Cost summary output
#[derive(Debug, Serialize)]
pub struct CostSummary {
    pub period: Option<String>,
    pub commit: Option<String>,
    pub branch: Option<String>,
    pub developer: Option<String>,
    pub total_cost_usd: f64,
    pub by_model: Vec<ModelCost>,
    pub by_agent: Vec<AgentCost>,
    pub commits: usize,
    pub ai_lines: i64,
    pub total_lines: i64,
    pub ai_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct ModelCost {
    pub model: String,
    pub cost_usd: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct AgentCost {
    pub agent: String,
    pub cost_usd: f64,
    pub percentage: f64,
}

/// Run the cost command
pub async fn run(
    commit: Option<&str>,
    branch: Option<&str>,
    developer: Option<&str>,
    since: Option<&str>,
    format: &str,
) -> Result<()> {
    let db = Database::open()?;
    let config = Config::load()?;

    let summary = if let Some(sha) = commit {
        get_commit_cost(&db, sha)?
    } else if let Some(branch_name) = branch {
        get_branch_cost(&db, &config, branch_name)?
    } else if let Some(dev) = developer {
        get_developer_cost(&db, dev, since)?
    } else {
        get_period_cost(&db, since.unwrap_or("7d"))?
    };

    match format {
        "json" => {
            println!("{}", serde_json::to_string_pretty(&summary)?);
        }
        _ => {
            print_text_cost(&summary);
        }
    }

    Ok(())
}

fn get_commit_cost(db: &Database, sha: &str) -> Result<CostSummary> {
    let attr = db.get_attribution(sha)?;
    let sessions = db.get_cost_sessions_for_commit(sha)?;

    let mut summary = CostSummary {
        period: None,
        commit: Some(sha.to_string()),
        branch: None,
        developer: None,
        total_cost_usd: 0.0,
        by_model: Vec::new(),
        by_agent: Vec::new(),
        commits: 1,
        ai_lines: 0,
        total_lines: 0,
        ai_percentage: 0.0,
    };

    if let Some(a) = attr {
        summary.ai_lines = a.ai_lines as i64;
        summary.total_lines = a.total_lines as i64;
        summary.ai_percentage = a.ai_pct;
        summary.total_cost_usd = a.total_cost_usd;
        summary.developer = Some(a.author_email);
    }

    // Aggregate by model and agent
    let mut model_costs: HashMap<String, f64> = HashMap::new();
    let mut agent_costs: HashMap<String, f64> = HashMap::new();

    for session in sessions {
        *model_costs.entry(session.model.clone()).or_insert(0.0) += session.cost_usd;
        *agent_costs.entry(session.agent.clone()).or_insert(0.0) += session.cost_usd;
    }

    for (model, cost) in model_costs {
        let pct = if summary.total_cost_usd > 0.0 {
            (cost / summary.total_cost_usd) * 100.0
        } else {
            0.0
        };
        summary.by_model.push(ModelCost {
            model,
            cost_usd: cost,
            percentage: pct,
        });
    }

    for (agent, cost) in agent_costs {
        let pct = if summary.total_cost_usd > 0.0 {
            (cost / summary.total_cost_usd) * 100.0
        } else {
            0.0
        };
        summary.by_agent.push(AgentCost {
            agent,
            cost_usd: cost,
            percentage: pct,
        });
    }

    Ok(summary)
}

fn get_branch_cost(db: &Database, config: &Config, branch: &str) -> Result<CostSummary> {
    // Get commits on branch since divergence from main
    let output = Command::new(&config.git_path)
        .args(["log", "--format=%H", &format!("main..{}", branch)])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits: Vec<&str> = stdout.lines().collect();

    let mut summary = CostSummary {
        period: None,
        commit: None,
        branch: Some(branch.to_string()),
        developer: None,
        total_cost_usd: 0.0,
        by_model: Vec::new(),
        by_agent: Vec::new(),
        commits: commits.len(),
        ai_lines: 0,
        total_lines: 0,
        ai_percentage: 0.0,
    };

    for sha in commits {
        if let Ok(Some(attr)) = db.get_attribution(sha) {
            summary.ai_lines += attr.ai_lines as i64;
            summary.total_lines += attr.total_lines as i64;
            summary.total_cost_usd += attr.total_cost_usd;
        }
    }

    if summary.total_lines > 0 {
        summary.ai_percentage = (summary.ai_lines as f64 / summary.total_lines as f64) * 100.0;
    }

    Ok(summary)
}

fn get_developer_cost(db: &Database, developer: &str, since: Option<&str>) -> Result<CostSummary> {
    let attrs = db.get_attributions_by_developer(developer)?;

    let mut summary = CostSummary {
        period: since.map(|s| s.to_string()),
        commit: None,
        branch: None,
        developer: Some(developer.to_string()),
        total_cost_usd: 0.0,
        by_model: Vec::new(),
        by_agent: Vec::new(),
        commits: attrs.len(),
        ai_lines: 0,
        total_lines: 0,
        ai_percentage: 0.0,
    };

    let mut model_costs: HashMap<String, f64> = HashMap::new();
    let mut agent_costs: HashMap<String, f64> = HashMap::new();

    for attr in &attrs {
        summary.ai_lines += attr.ai_lines as i64;
        summary.total_lines += attr.total_lines as i64;
        summary.total_cost_usd += attr.total_cost_usd;

        if let Ok(log) = serde_json::from_str::<AuthorshipLog>(&attr.log_json) {
            for session in &log.agent_sessions {
                *model_costs.entry(session.model.clone()).or_insert(0.0) += session.cost_usd;
                *agent_costs.entry(session.agent.clone()).or_insert(0.0) += session.cost_usd;
            }
        }
    }

    populate_cost_breakdowns(&mut summary, model_costs, agent_costs);

    if summary.total_lines > 0 {
        summary.ai_percentage = (summary.ai_lines as f64 / summary.total_lines as f64) * 100.0;
    }

    Ok(summary)
}

fn get_period_cost(db: &Database, period: &str) -> Result<CostSummary> {
    let duration = parse_period(period)?;
    let since = Utc::now() - duration;
    let attrs = db.get_attributions_since(since)?;

    let mut summary = CostSummary {
        period: Some(period.to_string()),
        commit: None,
        branch: None,
        developer: None,
        total_cost_usd: 0.0,
        by_model: Vec::new(),
        by_agent: Vec::new(),
        commits: attrs.len(),
        ai_lines: 0,
        total_lines: 0,
        ai_percentage: 0.0,
    };

    let mut model_costs: HashMap<String, f64> = HashMap::new();
    let mut agent_costs: HashMap<String, f64> = HashMap::new();

    for attr in &attrs {
        summary.ai_lines += attr.ai_lines as i64;
        summary.total_lines += attr.total_lines as i64;
        summary.total_cost_usd += attr.total_cost_usd;

        if let Ok(log) = serde_json::from_str::<AuthorshipLog>(&attr.log_json) {
            for session in &log.agent_sessions {
                *model_costs.entry(session.model.clone()).or_insert(0.0) += session.cost_usd;
                *agent_costs.entry(session.agent.clone()).or_insert(0.0) += session.cost_usd;
            }
        }
    }

    populate_cost_breakdowns(&mut summary, model_costs, agent_costs);

    if summary.total_lines > 0 {
        summary.ai_percentage = (summary.ai_lines as f64 / summary.total_lines as f64) * 100.0;
    }

    Ok(summary)
}

/// Populate by_model and by_agent fields on a CostSummary from aggregated maps.
fn populate_cost_breakdowns(
    summary: &mut CostSummary,
    model_costs: HashMap<String, f64>,
    agent_costs: HashMap<String, f64>,
) {
    for (model, cost) in model_costs {
        let pct = if summary.total_cost_usd > 0.0 {
            (cost / summary.total_cost_usd) * 100.0
        } else {
            0.0
        };
        summary.by_model.push(ModelCost {
            model,
            cost_usd: cost,
            percentage: pct,
        });
    }

    for (agent, cost) in agent_costs {
        let pct = if summary.total_cost_usd > 0.0 {
            (cost / summary.total_cost_usd) * 100.0
        } else {
            0.0
        };
        summary.by_agent.push(AgentCost {
            agent,
            cost_usd: cost,
            percentage: pct,
        });
    }
}

fn parse_period(period: &str) -> Result<Duration> {
    let period = period.trim().to_lowercase();

    if let Some(days) = period.strip_suffix('d') {
        let n: i64 = days.parse().map_err(|_| GitIntelError::InvalidTimePeriod(period.clone()))?;
        return Ok(Duration::days(n));
    }

    if let Some(weeks) = period.strip_suffix('w') {
        let n: i64 = weeks.parse().map_err(|_| GitIntelError::InvalidTimePeriod(period.clone()))?;
        return Ok(Duration::weeks(n));
    }

    if let Some(months) = period.strip_suffix('m') {
        let n: i64 = months.parse().map_err(|_| GitIntelError::InvalidTimePeriod(period.clone()))?;
        return Ok(Duration::days(n * 30));
    }

    Err(GitIntelError::InvalidTimePeriod(period))
}

fn print_text_cost(summary: &CostSummary) {
    // Header
    if let Some(sha) = &summary.commit {
        println!("{}", "─".repeat(50));
        println!("Commit: {} ", sha[..8].cyan());
        if let Some(dev) = &summary.developer {
            println!("Author: {}", dev);
        }
        println!("{}", "─".repeat(50));
    } else if let Some(branch) = &summary.branch {
        println!("Branch Cost: {}", branch.cyan());
        println!("{}", "─".repeat(50));
    } else if let Some(period) = &summary.period {
        println!("Cost Summary: last {}", period.yellow());
        println!("{}", "─".repeat(50));
    }

    // Cost breakdown
    println!(
        "Total Spend:     {}",
        format!("${:.2}", summary.total_cost_usd).yellow().bold()
    );

    if !summary.by_agent.is_empty() {
        for agent in &summary.by_agent {
            println!(
                "├─ {}: ${:.2} ({:.0}%)",
                agent.agent,
                agent.cost_usd,
                agent.percentage
            );
        }
    }

    println!();
    println!("Commits:         {}", summary.commits);
    println!(
        "Avg Cost/Commit: ${:.2}",
        if summary.commits > 0 {
            summary.total_cost_usd / summary.commits as f64
        } else {
            0.0
        }
    );
    println!(
        "AI Code Lines:   {} / {} ({:.1}%)",
        summary.ai_lines.to_string().blue(),
        summary.total_lines,
        summary.ai_percentage
    );
    println!("{}", "─".repeat(50));
}
