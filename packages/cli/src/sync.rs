//! Cloud sync functionality for GitIntel CLI

use crate::config::Config;
use crate::error::Result;
use crate::store::Database;
use colored::Colorize;

/// Run sync command
pub async fn run(_force: bool, dry_run: bool) -> Result<()> {
    let config = Config::load()?;
    let db = Database::open()?;

    if !config.cloud_sync.enabled {
        println!(
            "{} Cloud sync is disabled. Enable it with:",
            "Info:".cyan()
        );
        println!("  gitintel config --set cloud_sync.enabled=true");
        println!("  gitintel config --set cloud_sync.api_key=<your-api-key>");
        return Ok(());
    }

    if config.cloud_sync.api_key.is_empty() {
        println!("{} API key not configured. Set it with:", "Error:".red());
        println!("  gitintel config --set cloud_sync.api_key=<your-api-key>");
        return Ok(());
    }

    println!("{}", "Syncing to cloud...".cyan());

    if dry_run {
        println!("{}", "(Dry run - no changes will be made)".yellow());
    }

    // Get unsynced data
    let attributions = db.get_attributions_since(chrono::Utc::now() - chrono::Duration::days(30))?;

    println!("  Found {} attributions to sync", attributions.len());

    if dry_run {
        println!();
        println!("Would sync:");
        for attr in attributions.iter().take(5) {
            println!(
                "  {} {} ({:.1}% AI, ${:.4})",
                attr.commit_sha[..8].cyan(),
                attr.author_email,
                attr.ai_pct,
                attr.total_cost_usd
            );
        }
        if attributions.len() > 5 {
            println!("  ... and {} more", attributions.len() - 5);
        }
        return Ok(());
    }

    // Sync to cloud API
    let client = reqwest::Client::new();

    for attr in &attributions {
        let response = client
            .post(format!("{}/sync/attribution", config.cloud_sync.endpoint))
            .header("Authorization", format!("Bearer {}", config.cloud_sync.api_key))
            .json(&serde_json::json!({
                "commit_sha": attr.commit_sha,
                "repo_path": attr.repo_path,
                "author_email": attr.author_email,
                "authored_at": attr.authored_at.to_rfc3339(),
                "ai_lines": attr.ai_lines,
                "human_lines": attr.human_lines,
                "total_lines": attr.total_lines,
                "ai_pct": attr.ai_pct,
                "total_cost_usd": attr.total_cost_usd,
            }))
            .send()
            .await;

        match response {
            Ok(res) if res.status().is_success() => {
                // Mark as synced
            }
            Ok(res) => {
                tracing::warn!("Sync failed for {}: {}", attr.commit_sha, res.status());
            }
            Err(e) => {
                tracing::error!("Sync error: {}", e);
            }
        }
    }

    println!(
        "{} Synced {} attributions",
        "✓".green(),
        attributions.len()
    );

    Ok(())
}
