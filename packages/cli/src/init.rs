//! Repository initialization for GitIntel

use crate::config::{get_gitintel_home, Config};
use crate::error::{GitIntelError, Result};
use crate::hooks;
use crate::store::Database;
use crate::trailer_detection;
use colored::Colorize;
use std::path::Path;

/// Initialize GitIntel in the current repository
pub async fn run(force: bool) -> Result<()> {
    println!("{}", "Initializing GitIntel...".cyan());

    // Check if we're in a git repository
    let repo_path = std::env::current_dir()?;
    if !is_git_repo(&repo_path) {
        return Err(GitIntelError::NotAGitRepo);
    }

    // Create GitIntel home directory
    let gitintel_home = get_gitintel_home()?;
    if !gitintel_home.exists() {
        std::fs::create_dir_all(&gitintel_home)?;
        println!("  {} Created ~/.gitintel/", "✓".green());
    }

    // Create/update config
    let config = Config::load().unwrap_or_default();
    config.save()?;
    println!("  {} Configuration saved", "✓".green());

    // Initialize database
    let db = Database::open()?;
    println!("  {} Database initialized", "✓".green());

    // Install hooks
    hooks::install(force).await?;
    println!("  {} Git hooks installed", "✓".green());

    // Auto-configure Claude Code PostToolUse hooks
    match configure_claude_code_hooks() {
        Ok(configured) => {
            if configured {
                println!("  {} Claude Code auto-checkpoint configured", "✓".green());
            } else {
                println!("  {} Claude Code hooks already configured", "→".yellow());
            }
        }
        Err(e) => {
            println!("  {} Claude Code hook setup skipped: {}", "!".yellow(), e);
        }
    }

    // Create .gitintel directory in repo for local config
    let repo_gitintel = repo_path.join(".gitintel");
    if !repo_gitintel.exists() {
        std::fs::create_dir_all(&repo_gitintel)?;

        // Create .gitignore for sensitive files
        let gitignore = repo_gitintel.join(".gitignore");
        std::fs::write(
            &gitignore,
            "# Ignore local GitIntel data\n*.db\nconfig.local.json\n",
        )?;

        println!("  {} Created .gitintel/ in repository", "✓".green());
    }

    // Auto-scan commit history for AI-assisted commits via Co-Authored-By trailers
    println!();
    println!(
        "{}",
        "Scanning commit history for AI-assisted commits...".cyan()
    );
    let repo_path_str = repo_path.to_string_lossy().to_string();
    match trailer_detection::scan_repo(&repo_path_str, Some("90d"), Some(500), None) {
        Ok(ai_commits) => {
            let total_scanned = ai_commits.len();
            let mut stored = 0;
            for commit in &ai_commits {
                if db
                    .insert_scanned_attribution(
                        &commit.sha,
                        &commit.agent,
                        commit.confidence,
                        commit.insertions as i64,
                        commit.deletions as i64,
                        commit.files_changed as i64,
                    )
                    .is_ok()
                {
                    stored += 1;
                }
            }
            // Count total commits scanned (need to walk the revwalk to count)
            let scanned_total = count_recent_commits(&repo_path_str, 500);
            let pct = if scanned_total > 0 {
                (total_scanned as f64 / scanned_total as f64) * 100.0
            } else {
                0.0
            };
            println!(
                "  {} Scanned {} commits, found {} AI-assisted ({:.1}%)",
                "✓".green(),
                scanned_total,
                stored,
                pct
            );
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("not found") || msg.contains("no reference") || msg.contains("HEAD") {
                println!(
                    "  {} No commit history found — scan will run after your first commit.",
                    "→".yellow(),
                );
            } else {
                println!("  {} Auto-scan skipped: {}", "!".yellow(), msg);
            }
        }
    }

    println!();
    println!("{}", "GitIntel initialized successfully!".green().bold());
    println!();
    println!("  {}:", "Next steps".cyan().bold());
    println!(
        "    {}  Run {} to detect existing AI commits",
        "1.".white().bold(),
        "gitintel scan".green()
    );
    println!(
        "    {}  Run {} to view AI adoption stats",
        "2.".white().bold(),
        "gitintel stats".green()
    );
    println!(
        "    {}  Run {} to check line-level attribution",
        "3.".white().bold(),
        "gitintel blame <file>".green()
    );
    println!();
    println!(
        "  {} For OTel telemetry, set {} and {} in your shell profile.",
        "Optional:".dimmed(),
        "CLAUDE_CODE_ENABLE_TELEMETRY=1".yellow(),
        format!(
            "OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:{}",
            config.otel.port
        )
        .yellow()
    );

    Ok(())
}

/// Configure Claude Code's ~/.claude/settings.json to auto-checkpoint on every Write/Edit.
///
/// Returns `Ok(true)` when the file was updated, `Ok(false)` when already configured.
fn configure_claude_code_hooks() -> std::result::Result<bool, Box<dyn std::error::Error>> {
    let home = dirs::home_dir().ok_or("cannot determine home directory")?;
    let settings_path = home.join(".claude").join("settings.json");

    // Read or start fresh
    let mut settings: serde_json::Value = if settings_path.exists() {
        let raw = std::fs::read_to_string(&settings_path)?;
        serde_json::from_str(&raw).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // Check if already configured
    if let Some(hooks) = settings.get("hooks") {
        if let Some(post_tool_use) = hooks.get("PostToolUse") {
            if let Some(arr) = post_tool_use.as_array() {
                let already = arr.iter().any(|entry| {
                    entry
                        .get("hooks")
                        .and_then(|h| h.as_array())
                        .map(|cmds| {
                            cmds.iter().any(|cmd| {
                                cmd.get("command")
                                    .and_then(|c| c.as_str())
                                    .map(|s| {
                                        s.contains("gitintel hooks run claude-post-tool-use")
                                            || s.contains("gitintel checkpoint")
                                    })
                                    .unwrap_or(false)
                            })
                        })
                        .unwrap_or(false)
                });
                if already {
                    return Ok(false);
                }
            }
        }
    }

    // Build the hook entry.
    // `gitintel hooks run claude-post-tool-use` reads the PostToolUse JSON
    // payload from stdin and calls `gitintel checkpoint` with the real file
    // path and session metadata — no shell env var guessing required.
    let hook_entry = serde_json::json!({
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
            {
                "type": "command",
                "command": "gitintel hooks run claude-post-tool-use"
            }
        ]
    });

    // Append to PostToolUse array
    let hooks_obj = settings
        .as_object_mut()
        .ok_or("settings.json root is not an object")?
        .entry("hooks")
        .or_insert(serde_json::json!({}));

    let post_tool_use = hooks_obj
        .as_object_mut()
        .ok_or("hooks is not an object")?
        .entry("PostToolUse")
        .or_insert(serde_json::json!([]));

    post_tool_use
        .as_array_mut()
        .ok_or("PostToolUse is not an array")?
        .push(hook_entry);

    // Write back
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let pretty = serde_json::to_string_pretty(&settings)?;
    std::fs::write(&settings_path, pretty)?;

    Ok(true)
}

fn is_git_repo(path: &Path) -> bool {
    let git_dir = path.join(".git");
    git_dir.exists() && git_dir.is_dir()
}

/// Count recent commits in the repo (up to `limit`), limited to last 90 days.
fn count_recent_commits(repo_path: &str, limit: usize) -> usize {
    let repo = match git2::Repository::open(repo_path) {
        Ok(r) => r,
        Err(_) => return 0,
    };

    let mut revwalk = match repo.revwalk() {
        Ok(r) => r,
        Err(_) => return 0,
    };

    if revwalk.push_head().is_err() {
        return 0;
    }

    let _ = revwalk.set_sorting(git2::Sort::TIME);

    let since_epoch = (chrono::Utc::now() - chrono::Duration::days(90)).timestamp();

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
        if count >= limit {
            break;
        }
    }

    count
}
