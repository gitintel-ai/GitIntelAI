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
    println!("  {}", format!("export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:{}", config.otel.port).yellow());
    println!();
    println!("Then restart your terminal or run: {}", "source ~/.bashrc".cyan());

    Ok(())
}

fn is_git_repo(path: &Path) -> bool {
    let git_dir = path.join(".git");
    git_dir.exists() && git_dir.is_dir()
}
