//! Cost tracking command - show development costs

use crate::config::Config;
use crate::error::{GitIntelError, Result};
use crate::hooks::post_commit::AuthorshipLog;
use crate::pricing;
use crate::store::Database;
use chrono::{Duration, Utc};
use colored::Colorize;
use serde::Serialize;
use std::collections::HashMap;
use std::process::Command;

/// Cost summary output.
///
/// `measured_cost_usd` / `measured_sessions` are populated when the session
/// reader has enriched `cost_sessions` rows linked to this commit (or to
/// commits in the period for aggregate queries). `None` means no measured
/// signal exists yet; callers should fall back to `total_cost_usd` for
/// display. Yield breakdown is per-session, not per-line.
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub measured_cost_usd: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub measured_sessions: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub yield_breakdown: Option<YieldBreakdown>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub by_category: Vec<CategoryCost>,
}

#[derive(Debug, Serialize, Default)]
pub struct YieldBreakdown {
    pub productive: usize,
    pub reverted: usize,
    pub abandoned: usize,
}

#[derive(Debug, Serialize)]
pub struct CategoryCost {
    pub category: String,
    pub cost_usd: f64,
    pub sessions: usize,
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
        measured_cost_usd: None,
        measured_sessions: None,
        yield_breakdown: None,
        by_category: Vec::new(),
    };

    if let Some(a) = attr {
        summary.ai_lines = a.ai_lines as i64;
        summary.total_lines = (a.total_lines as i64).max(a.ai_lines as i64);
        summary.ai_percentage = if summary.total_lines > 0 {
            ((summary.ai_lines as f64 / summary.total_lines as f64) * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };
        summary.total_cost_usd = a.total_cost_usd;
        summary.developer = Some(a.author_email);
    }

    // Aggregate by model and agent
    let mut model_costs: HashMap<String, f64> = HashMap::new();
    let mut agent_costs: HashMap<String, f64> = HashMap::new();
    let mut category_costs: HashMap<String, (f64, usize)> = HashMap::new();
    let mut measured_cost = 0f64;
    let mut measured_count = 0usize;
    let mut yields = YieldBreakdown::default();
    let mut saw_yield = false;

    for session in &sessions {
        *model_costs.entry(session.model.clone()).or_insert(0.0) += session.cost_usd;
        *agent_costs.entry(session.agent.clone()).or_insert(0.0) += session.cost_usd;
        if session.is_measured {
            let v = session.measured_cost_usd.unwrap_or(session.cost_usd);
            measured_cost += v;
            measured_count += 1;
        }
        if let Some(cat) = &session.category {
            let entry = category_costs.entry(cat.clone()).or_insert((0.0, 0));
            entry.0 += session.cost_usd;
            entry.1 += 1;
        }
        match session.yield_outcome.as_deref() {
            Some("productive") => {
                yields.productive += 1;
                saw_yield = true;
            }
            Some("reverted") => {
                yields.reverted += 1;
                saw_yield = true;
            }
            Some("abandoned") => {
                yields.abandoned += 1;
                saw_yield = true;
            }
            _ => {}
        }
    }

    if measured_count > 0 {
        summary.measured_cost_usd = Some(measured_cost);
        summary.measured_sessions = Some(measured_count);
    }
    if saw_yield {
        summary.yield_breakdown = Some(yields);
    }
    for (cat, (cost, n)) in category_costs {
        summary.by_category.push(CategoryCost {
            category: cat,
            cost_usd: cost,
            sessions: n,
        });
    }
    summary.by_category.sort_by(|a, b| {
        b.cost_usd
            .partial_cmp(&a.cost_usd)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

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
        measured_cost_usd: None,
        measured_sessions: None,
        yield_breakdown: None,
        by_category: Vec::new(),
    };

    for sha in commits {
        if let Ok(Some(attr)) = db.get_attribution(sha) {
            summary.ai_lines += attr.ai_lines as i64;
            summary.total_lines += attr.total_lines as i64;
            summary.total_cost_usd += attr.total_cost_usd;
        }
    }

    if summary.total_lines < summary.ai_lines {
        summary.total_lines = summary.ai_lines;
    }
    if summary.total_lines > 0 {
        summary.ai_percentage =
            ((summary.ai_lines as f64 / summary.total_lines as f64) * 100.0).clamp(0.0, 100.0);
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
        measured_cost_usd: None,
        measured_sessions: None,
        yield_breakdown: None,
        by_category: Vec::new(),
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

    if summary.total_lines < summary.ai_lines {
        summary.total_lines = summary.ai_lines;
    }
    if summary.total_lines > 0 {
        summary.ai_percentage =
            ((summary.ai_lines as f64 / summary.total_lines as f64) * 100.0).clamp(0.0, 100.0);
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
        measured_cost_usd: None,
        measured_sessions: None,
        yield_breakdown: None,
        by_category: Vec::new(),
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

    if summary.total_lines < summary.ai_lines {
        summary.total_lines = summary.ai_lines;
    }
    if summary.total_lines > 0 {
        summary.ai_percentage =
            ((summary.ai_lines as f64 / summary.total_lines as f64) * 100.0).clamp(0.0, 100.0);
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
        let n: i64 = days
            .parse()
            .map_err(|_| GitIntelError::InvalidTimePeriod(period.clone()))?;
        return Ok(Duration::days(n));
    }

    if let Some(weeks) = period.strip_suffix('w') {
        let n: i64 = weeks
            .parse()
            .map_err(|_| GitIntelError::InvalidTimePeriod(period.clone()))?;
        return Ok(Duration::weeks(n));
    }

    if let Some(months) = period.strip_suffix('m') {
        let n: i64 = months
            .parse()
            .map_err(|_| GitIntelError::InvalidTimePeriod(period.clone()))?;
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
                agent.agent, agent.cost_usd, agent.percentage
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

    // Measured-cost summary (session_reader enrichment) — only printed when
    // we have at least one measured session linked to this view.
    if let (Some(measured), Some(count)) = (summary.measured_cost_usd, summary.measured_sessions) {
        let total = summary.total_cost_usd;
        let pct = if total > 0.0 {
            (measured / total) * 100.0
        } else {
            0.0
        };
        println!();
        println!("{}", "Measured (session reader):".bold());
        println!(
            "  Cost:     {} across {} session{} ({:.1}% of total)",
            format!("${:.4}", measured).green(),
            count.to_string().cyan(),
            if count == 1 { "" } else { "s" },
            pct
        );
    }
    if let Some(y) = &summary.yield_breakdown {
        let total = y.productive + y.reverted + y.abandoned;
        if total > 0 {
            println!(
                "  Yield:    {} productive · {} reverted · {} abandoned",
                y.productive.to_string().green(),
                y.reverted.to_string().yellow(),
                y.abandoned.to_string().dimmed(),
            );
        }
    }
    if !summary.by_category.is_empty() {
        println!("{}", "  Top categories:".dimmed());
        for cat in summary.by_category.iter().take(3) {
            println!(
                "    {} — ${:.4} ({} session{})",
                cat.category.cyan(),
                cat.cost_usd,
                cat.sessions,
                if cat.sessions == 1 { "" } else { "s" }
            );
        }
    }

    println!("{}", "─".repeat(50));

    // Accuracy disclaimer — call it out so estimates are read as estimates.
    println!("{} {}", "ⓘ".cyan(), pricing::disclaimer().dimmed());
}
