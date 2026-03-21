//! Git hooks module for GitIntel

pub mod post_commit;
pub mod post_rewrite;
pub mod pre_commit;
pub mod prepare_msg;

use crate::config::{get_hooks_path, Config};
use crate::error::Result;
use colored::Colorize;
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

/// Install git hooks
pub async fn install(force: bool) -> Result<()> {
    let hooks_path = get_hooks_path()?;
    fs::create_dir_all(&hooks_path)?;

    // Hook scripts to install
    let hooks = [
        ("pre-commit", templates::PRE_COMMIT),
        ("post-commit", templates::POST_COMMIT),
        ("prepare-commit-msg", templates::PREPARE_COMMIT_MSG),
        ("post-rewrite", templates::POST_REWRITE),
        ("post-merge", templates::POST_MERGE),
    ];

    for (name, content) in hooks {
        let hook_path = hooks_path.join(name);

        if hook_path.exists() && !force {
            println!(
                "  {} Hook {} already exists (use --force to overwrite)",
                "→".yellow(),
                name
            );
            continue;
        }

        fs::write(&hook_path, content)?;

        // Make executable on Unix
        #[cfg(unix)]
        {
            let mut perms = fs::metadata(&hook_path)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&hook_path, perms)?;
        }

        println!("  {} Installed {}", "✓".green(), name);
    }

    // Update git config to use our hooks path
    let config = Config::load()?;
    let output = std::process::Command::new(&config.git_path)
        .args([
            "config",
            "--global",
            "core.hooksPath",
            hooks_path.to_str().unwrap(),
        ])
        .output()?;

    if output.status.success() {
        println!("  {} Set global hooks path", "✓".green());
    }

    Ok(())
}

/// Uninstall git hooks
pub async fn uninstall() -> Result<()> {
    let config = Config::load()?;

    // Remove global hooks path config
    let _ = std::process::Command::new(&config.git_path)
        .args(["config", "--global", "--unset", "core.hooksPath"])
        .output();

    println!("{} Git hooks uninstalled", "✓".green());
    println!("Note: Hook files in ~/.gitintel/hooks/ have been preserved.");

    Ok(())
}

/// Show hook status
pub async fn status() -> Result<()> {
    let hooks_path = get_hooks_path()?;
    let config = Config::load()?;

    println!("{}", "GitIntel Hook Status".bold());
    println!("{}", "─".repeat(40));

    // Check global hooks path
    let output = std::process::Command::new(&config.git_path)
        .args(["config", "--global", "core.hooksPath"])
        .output()?;

    let current_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let expected_path = hooks_path.to_str().unwrap_or("");

    if current_path == expected_path {
        println!("{} Global hooks path: {}", "✓".green(), current_path.cyan());
    } else if current_path.is_empty() {
        println!("{} Global hooks path: not set", "✗".red());
    } else {
        println!(
            "{} Global hooks path: {} (expected: {})",
            "!".yellow(),
            current_path,
            expected_path
        );
    }

    // Check individual hooks
    let hook_names = [
        "pre-commit",
        "post-commit",
        "prepare-commit-msg",
        "post-rewrite",
        "post-merge",
    ];

    println!();
    println!("Installed hooks:");
    for name in hook_names {
        let hook_path = hooks_path.join(name);
        if hook_path.exists() {
            println!("  {} {}", "✓".green(), name);
        } else {
            println!("  {} {}", "✗".red(), name.dimmed());
        }
    }

    Ok(())
}

/// Run pre-commit hook logic
pub async fn run_pre_commit() -> Result<()> {
    pre_commit::run().await
}

/// Run post-commit hook logic
pub async fn run_post_commit() -> Result<()> {
    post_commit::run().await
}

/// Run post-rewrite hook logic
pub async fn run_post_rewrite(cause: &str) -> Result<()> {
    post_rewrite::run(cause).await
}

/// Run post-merge hook logic
pub async fn run_post_merge() -> Result<()> {
    post_rewrite::run("merge").await
}

/// Dispatch a named hook — called from git hook shell scripts via `gitintel hooks run <name>`
pub async fn run_hook(hook_name: &str, hook_args: &[String]) -> Result<()> {
    match hook_name {
        "pre-commit" => run_pre_commit().await,
        "post-commit" => run_post_commit().await,
        "prepare-commit-msg" => {
            let msg_file = hook_args
                .first()
                .map(|s| s.as_str())
                .unwrap_or(".git/COMMIT_EDITMSG");
            prepare_msg::run(msg_file).await
        }
        "post-rewrite" => {
            let cause = hook_args.first().map(|s| s.as_str()).unwrap_or("rebase");
            run_post_rewrite(cause).await
        }
        "post-merge" => run_post_merge().await,
        "claude-post-tool-use" => crate::claude_hooks::handle_post_tool_use().await,
        unknown => {
            tracing::warn!("Unknown gitintel hook: {}", unknown);
            Ok(())
        }
    }
}

// Hook script templates as submodule
mod templates {
    pub const PRE_COMMIT: &str = r#"#!/bin/sh
# GitIntel pre-commit hook
exec gitintel hooks run pre-commit "$@"
"#;

    pub const POST_COMMIT: &str = r#"#!/bin/sh
# GitIntel post-commit hook
exec gitintel hooks run post-commit "$@"
"#;

    pub const PREPARE_COMMIT_MSG: &str = r#"#!/bin/sh
# GitIntel prepare-commit-msg hook
exec gitintel hooks run prepare-commit-msg "$@"
"#;

    pub const POST_REWRITE: &str = r#"#!/bin/sh
# GitIntel post-rewrite hook
exec gitintel hooks run post-rewrite "$@"
"#;

    pub const POST_MERGE: &str = r#"#!/bin/sh
# GitIntel post-merge hook
exec gitintel hooks run post-merge "$@"
"#;
}
