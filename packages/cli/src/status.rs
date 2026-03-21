//! Status / health check command for GitIntel

use crate::config::{get_db_path, get_gitintel_home};
use crate::error::Result;
use crate::store::Database;
use colored::Colorize;

/// Run the status health-check command
pub async fn run() -> Result<()> {
    let repo_path = std::env::current_dir()?;

    // --- Repo & init status ---
    let git_dir = repo_path.join(".git");
    let is_git = git_dir.exists() && git_dir.is_dir();
    let repo_gitintel = repo_path.join(".gitintel");
    let initialized = repo_gitintel.exists() && repo_gitintel.is_dir();

    println!("{}", "GitIntel Status".cyan().bold());
    println!();
    println!(
        "  Repo:          {}",
        repo_path.display().to_string().white()
    );
    if !is_git {
        println!(
            "  Git:           {}",
            "not a git repository".red()
        );
        return Ok(());
    }
    println!(
        "  Initialized:   {}",
        if initialized {
            "yes".green().to_string()
        } else {
            "no (run gitintel init)".yellow().to_string()
        }
    );

    // --- Hook status ---
    let hooks_dir = git_dir.join("hooks");
    let post_commit_hook = hooks_dir.join("post-commit");
    let hook_installed = if post_commit_hook.exists() {
        let content = std::fs::read_to_string(&post_commit_hook).unwrap_or_default();
        content.contains("gitintel")
    } else {
        false
    };

    // Also check core.hooksPath
    let gitintel_home = get_gitintel_home()?;
    let global_hooks = gitintel_home.join("hooks").join("post-commit");
    let global_hook_installed = global_hooks.exists();

    let hook_label = if hook_installed {
        "installed (repo)".green().to_string()
    } else if global_hook_installed {
        "installed (global)".green().to_string()
    } else {
        "not installed".yellow().to_string()
    };
    println!("  Hooks:         {}", hook_label);

    // --- Database info ---
    let db_path = get_db_path()?;
    let db_exists = db_path.exists();
    println!(
        "  Database:      {}",
        if db_exists {
            db_path.display().to_string().white().to_string()
        } else {
            "not found".yellow().to_string()
        }
    );

    let mut checkpoint_count: i64 = 0;
    let mut last_checkpoint: Option<String> = None;
    if db_exists {
        if let Ok(db) = Database::open() {
            // Count pending checkpoints
            if let Ok(pending) = db.get_pending_checkpoints() {
                checkpoint_count = pending.len() as i64;
                if let Some(last) = pending.last() {
                    last_checkpoint = Some(format!(
                        "{} — {} ({})",
                        last.timestamp.format("%Y-%m-%d %H:%M"),
                        last.file_path,
                        last.agent
                    ));
                }
            }
        }
    }
    println!(
        "  Checkpoints:   {} pending",
        checkpoint_count.to_string().white()
    );
    if let Some(ref lc) = last_checkpoint {
        println!("  Last:          {}", lc.dimmed());
    }

    // --- Claude Code hooks ---
    let home = dirs::home_dir();
    let claude_configured = home
        .as_ref()
        .map(|h| {
            let settings_path = h.join(".claude").join("settings.json");
            if settings_path.exists() {
                let content = std::fs::read_to_string(&settings_path).unwrap_or_default();
                content.contains("gitintel")
            } else {
                false
            }
        })
        .unwrap_or(false);
    println!(
        "  Claude hooks:  {}",
        if claude_configured {
            "configured".green().to_string()
        } else {
            "not configured".yellow().to_string()
        }
    );

    // --- Last commit info ---
    let last_commit = std::process::Command::new("git")
        .args(["log", "-1", "--format=%h %s (%ar)"])
        .current_dir(&repo_path)
        .output();

    if let Ok(output) = last_commit {
        if output.status.success() {
            let msg = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !msg.is_empty() {
                println!("  Last commit:   {}", msg.dimmed());
            }
        }
    }

    // --- Issues ---
    let mut issues: Vec<String> = Vec::new();
    if !initialized {
        issues.push("GitIntel not initialized — run `gitintel init`".to_string());
    }
    if !hook_installed && !global_hook_installed {
        issues.push("Git hooks not installed — run `gitintel hooks install`".to_string());
    }
    if !claude_configured {
        issues.push(
            "Claude Code hooks not configured — run `gitintel init` to auto-configure".to_string(),
        );
    }

    if !issues.is_empty() {
        println!();
        println!("  {}:", "Issues".yellow().bold());
        for issue in &issues {
            println!("    {} {}", "!".yellow(), issue);
        }
    } else {
        println!();
        println!("  {}", "No issues detected.".green());
    }

    Ok(())
}
