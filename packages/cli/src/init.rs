//! Repository initialization for GitIntel

use crate::config::{get_gitintel_home, Config};
use crate::error::{GitIntelError, Result};
use crate::hooks;
use crate::store::Database;
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
    let _db = Database::open()?;
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
            println!(
                "  {} Claude Code hook setup skipped: {}",
                "!".yellow(),
                e
            );
        }
    }

    // Create .gitintel directory in repo for local config
    let repo_gitintel = repo_path.join(".gitintel");
    if !repo_gitintel.exists() {
        std::fs::create_dir_all(&repo_gitintel)?;

        // Create .gitignore for sensitive files
        let gitignore = repo_gitintel.join(".gitignore");
        std::fs::write(&gitignore, "# Ignore local GitIntel data\n*.db\nconfig.local.json\n")?;

        println!("  {} Created .gitintel/ in repository", "✓".green());
    }

    // Set up environment variables hint
    println!();
    println!("{}", "GitIntel initialized successfully!".green().bold());
    println!();
    println!("To enable Claude Code telemetry, add to your shell profile:");
    println!();
    println!("  {}", "export CLAUDE_CODE_ENABLE_TELEMETRY=1".yellow());
    println!(
        "  {}",
        format!(
            "export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:{}",
            config.otel.port
        )
        .yellow()
    );
    println!();
    println!(
        "Then restart your terminal or run: {}",
        "source ~/.bashrc".cyan()
    );
    println!();
    println!(
        "Auto-attribution for Claude Code is now active — no manual {} needed!",
        "gitintel checkpoint".cyan()
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
                                    .map(|s| s.contains("gitintel checkpoint"))
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

    // Build the hook entry
    let hook_entry = serde_json::json!({
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
            {
                "type": "command",
                "command": "gitintel checkpoint --agent \"Claude Code\" --model \"${CLAUDE_MODEL:-unknown}\" --session-id \"${CLAUDE_SESSION_ID:-no-session}\" --file \"${CLAUDE_FILE_PATH:-.}\" --lines \"1-999\" --tokens-in \"${CLAUDE_TOKENS_IN:-0}\" --tokens-out \"${CLAUDE_TOKENS_OUT:-0}\" --cost-usd \"${CLAUDE_COST_USD:-0.0}\""
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
