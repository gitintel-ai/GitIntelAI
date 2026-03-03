//! Statistics command - show AI adoption metrics

use crate::error::{GitIntelError, Result};
use crate::store::Database;
use chrono::{Duration, Utc};
use colored::Colorize;
use serde::Serialize;

/// Statistics output
#[derive(Debug, Serialize)]
pub struct Stats {
    pub period: String,
    pub total_commits: usize,
    pub total_lines: i64,
    pub ai_lines: i64,
    pub human_lines: i64,
    pub ai_percentage: f64,
    pub total_cost_usd: f64,
    pub by_developer: Vec<DeveloperStats>,
}

#[derive(Debug, Serialize)]
pub struct DeveloperStats {
    pub email: String,
    pub commits: usize,
    pub ai_lines: i64,
    pub human_lines: i64,
    pub ai_percentage: f64,
    pub cost_usd: f64,
}

/// Parse period string to Duration
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

/// Run the stats command
pub async fn run(
    developer: Option<&str>,
    since: &str,
    format: &str,
) -> Result<()> {
    let db = Database::open()?;
    let duration = parse_period(since)?;
    let since_date = Utc::now() - duration;

    // Get attributions
    let attributions = if let Some(dev) = developer {
        db.get_attributions_by_developer(dev)?
    } else {
        db.get_attributions_since(since_date)?
    };

    // Calculate statistics
    let mut stats = Stats {
        period: since.to_string(),
        total_commits: attributions.len(),
        total_lines: 0,
        ai_lines: 0,
        human_lines: 0,
        ai_percentage: 0.0,
        total_cost_usd: 0.0,
        by_developer: Vec::new(),
    };

    // Aggregate by developer
    let mut dev_map: std::collections::HashMap<String, DeveloperStats> = std::collections::HashMap::new();

    for attr in &attributions {
        stats.total_lines += attr.total_lines as i64;
        stats.ai_lines += attr.ai_lines as i64;
        stats.human_lines += attr.human_lines as i64;
        stats.total_cost_usd += attr.total_cost_usd;

        let dev_stats = dev_map.entry(attr.author_email.clone()).or_insert(DeveloperStats {
            email: attr.author_email.clone(),
            commits: 0,
            ai_lines: 0,
            human_lines: 0,
            ai_percentage: 0.0,
            cost_usd: 0.0,
        });

        dev_stats.commits += 1;
        dev_stats.ai_lines += attr.ai_lines as i64;
        dev_stats.human_lines += attr.human_lines as i64;
        dev_stats.cost_usd += attr.total_cost_usd;
    }

    // Calculate percentages
    if stats.total_lines > 0 {
        stats.ai_percentage = (stats.ai_lines as f64 / stats.total_lines as f64) * 100.0;
    }

    for dev_stats in dev_map.values_mut() {
        let total = dev_stats.ai_lines + dev_stats.human_lines;
        if total > 0 {
            dev_stats.ai_percentage = (dev_stats.ai_lines as f64 / total as f64) * 100.0;
        }
    }

    stats.by_developer = dev_map.into_values().collect();
    stats.by_developer.sort_by(|a, b| b.ai_percentage.partial_cmp(&a.ai_percentage).unwrap());

    // Output
    match format {
        "json" => {
            println!("{}", serde_json::to_string_pretty(&stats)?);
        }
        "csv" => {
            println!("email,commits,ai_lines,human_lines,ai_percentage,cost_usd");
            for dev in &stats.by_developer {
                println!(
                    "{},{},{},{},{:.1},{:.4}",
                    dev.email, dev.commits, dev.ai_lines, dev.human_lines, dev.ai_percentage, dev.cost_usd
                );
            }
        }
        _ => {
            print_text_stats(&stats, developer);
        }
    }

    Ok(())
}

fn print_text_stats(stats: &Stats, developer: Option<&str>) {
    let title = if let Some(dev) = developer {
        format!("AI Adoption Stats: {}", dev.cyan())
    } else {
        "AI Adoption Stats: Repository".to_string()
    };

    println!("{}", title.bold());
    println!("Period: last {}", stats.period.yellow());
    println!("{}", "─".repeat(60));

    // Summary stats
    println!(
        "Total Commits:  {}",
        stats.total_commits.to_string().cyan()
    );
    println!(
        "Total Lines:    {}",
        stats.total_lines.to_string().cyan()
    );
    println!();

    // AI/Human breakdown
    let ai_bar = create_bar(stats.ai_percentage, 30);
    println!("AI-Generated:   {} {:>5.1}%", ai_bar.blue(), stats.ai_percentage);
    println!(
        "                {} lines",
        stats.ai_lines.to_string().blue()
    );

    let human_pct = 100.0 - stats.ai_percentage;
    let human_bar = create_bar(human_pct, 30);
    println!("Human-Written:  {} {:>5.1}%", human_bar.green(), human_pct);
    println!(
        "                {} lines",
        stats.human_lines.to_string().green()
    );

    println!();
    println!(
        "Total Cost:     {}",
        format!("${:.2}", stats.total_cost_usd).yellow()
    );

    // Per-developer breakdown
    if !stats.by_developer.is_empty() && developer.is_none() {
        println!();
        println!("{}", "By Developer:".bold());
        println!("{}", "─".repeat(60));

        for dev in &stats.by_developer {
            let bar = create_bar(dev.ai_percentage, 20);
            println!(
                "{:<30} {} {:>5.1}% ({} commits, ${:.2})",
                dev.email.dimmed(),
                bar.blue(),
                dev.ai_percentage,
                dev.commits,
                dev.cost_usd
            );
        }
    }
}

fn create_bar(percentage: f64, width: usize) -> String {
    let filled = ((percentage / 100.0) * width as f64).round() as usize;
    let empty = width.saturating_sub(filled);
    format!("[{}{}]", "█".repeat(filled), "░".repeat(empty))
}
