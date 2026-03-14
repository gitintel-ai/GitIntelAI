//! GitIntel CLI - Git-native AI adoption tracking, cost intelligence & context optimization
//!
//! This binary acts as a transparent git proxy, intercepting git commands to track
//! AI-generated code attribution, development costs, and context optimization.

mod blame;
mod checkpoint;
mod claude_hooks;
mod config;
mod context;
mod cost;
mod error;
mod hooks;
mod init;
mod otel;
mod proxy;
mod stats;
mod store;
mod sync;
mod update;

use clap::{Parser, Subcommand};
use colored::Colorize;
use std::process::ExitCode;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// GitIntel CLI - Git-native AI adoption tracking
#[derive(Parser)]
#[command(name = "gitintel")]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// Git subcommand to proxy (when called as git replacement)
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
    git_args: Vec<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize gitintel in the current repository
    Init {
        /// Force re-initialization
        #[arg(short, long)]
        force: bool,
    },

    /// Record a checkpoint from an AI coding agent
    Checkpoint {
        /// Agent name (e.g., "Claude Code", "Cursor", "Copilot")
        #[arg(long)]
        agent: String,

        /// Model name (e.g., "claude-opus-4-5")
        #[arg(long)]
        model: String,

        /// Session ID for correlation
        #[arg(long)]
        session_id: String,

        /// File path being edited
        #[arg(long)]
        file: String,

        /// Line ranges (e.g., "12-45,78-103")
        #[arg(long)]
        lines: String,

        /// Input tokens used
        #[arg(long, default_value = "0")]
        tokens_in: u64,

        /// Output tokens used
        #[arg(long, default_value = "0")]
        tokens_out: u64,

        /// Cost in USD
        #[arg(long, default_value = "0.0")]
        cost_usd: f64,

        /// Transcript reference (SHA or URL)
        #[arg(long)]
        transcript_ref: Option<String>,
    },

    /// Show AI/Human attribution for a file (extends git blame)
    Blame {
        /// File to blame
        file: String,

        /// Commit to blame from
        #[arg(short, long)]
        commit: Option<String>,

        /// Show only AI-generated lines
        #[arg(long)]
        ai_only: bool,

        /// Show only human-written lines
        #[arg(long)]
        human_only: bool,
    },

    /// Show AI adoption statistics
    Stats {
        /// Show stats for a specific developer
        #[arg(long)]
        developer: Option<String>,

        /// Time period (e.g., "7d", "30d", "3m")
        #[arg(long, default_value = "30d")]
        since: String,

        /// Output format (text, json, csv)
        #[arg(long, default_value = "text")]
        format: String,
    },

    /// Show development cost tracking
    Cost {
        /// Show cost for a specific commit
        #[arg(long)]
        commit: Option<String>,

        /// Show cost for a branch
        #[arg(long)]
        branch: Option<String>,

        /// Show cost for a developer
        #[arg(long)]
        developer: Option<String>,

        /// Time period (e.g., "7d", "30d")
        #[arg(long)]
        since: Option<String>,

        /// Output format (text, json)
        #[arg(long, default_value = "text")]
        format: String,
    },

    /// Context and CLAUDE.md management
    Context {
        #[command(subcommand)]
        action: ContextCommands,
    },

    /// Memory store management
    Memory {
        #[command(subcommand)]
        action: MemoryCommands,
    },

    /// Sync local data to cloud
    Sync {
        /// Force full sync
        #[arg(short, long)]
        force: bool,

        /// Dry run (don't actually sync)
        #[arg(long)]
        dry_run: bool,
    },

    /// Manage git hooks
    Hooks {
        #[command(subcommand)]
        action: HookCommands,
    },

    /// Show current configuration
    Config {
        /// Show configuration as JSON
        #[arg(long)]
        json: bool,

        /// Set a configuration value
        #[arg(long)]
        set: Option<String>,
    },

    /// Check for and install CLI updates
    Update {
        /// Only check, do not install
        #[arg(long)]
        check: bool,
    },
}

#[derive(Subcommand)]
enum ContextCommands {
    /// Generate CLAUDE.md from repo analysis
    Init {
        /// Output file path
        #[arg(short, long, default_value = "CLAUDE.md")]
        output: String,

        /// Force overwrite existing file
        #[arg(short, long)]
        force: bool,
    },

    /// Optimize CLAUDE.md by pruning unused sections
    Optimize {
        /// Input file path
        #[arg(short, long, default_value = "CLAUDE.md")]
        input: String,

        /// Apply changes (default: dry run)
        #[arg(long)]
        apply: bool,
    },

    /// Show token diff before/after optimization
    Diff {
        /// Input file path
        #[arg(short, long, default_value = "CLAUDE.md")]
        input: String,
    },
}

#[derive(Subcommand)]
enum MemoryCommands {
    /// Add a fact to memory
    Add {
        /// Memory key
        #[arg(long)]
        key: String,

        /// Memory value
        #[arg(long)]
        value: String,

        /// Category (architecture, conventions, dependencies)
        #[arg(long, default_value = "general")]
        category: String,
    },

    /// Get a fact from memory
    Get {
        /// Memory key
        key: String,
    },

    /// List all memory facts
    List {
        /// Filter by category
        #[arg(long)]
        category: Option<String>,
    },

    /// Prune unused memory facts
    Prune {
        /// Days since last use
        #[arg(long, default_value = "30")]
        unused_days: u32,

        /// Dry run (don't actually prune)
        #[arg(long)]
        dry_run: bool,
    },

    /// Export memory to CLAUDE.md section
    Export {
        /// Output format (markdown, yaml, json)
        #[arg(long, default_value = "markdown")]
        format: String,
    },

    /// Show memory statistics
    Stats,
}

#[derive(Subcommand)]
enum HookCommands {
    /// Install git hooks
    Install {
        /// Force reinstall
        #[arg(short, long)]
        force: bool,
    },

    /// Uninstall git hooks
    Uninstall,

    /// Show hook status
    Status,

    /// Run a specific hook (invoked internally by git hook scripts)
    Run {
        /// Hook name (pre-commit, post-commit, prepare-commit-msg, post-rewrite, post-merge)
        hook_name: String,

        /// Additional arguments passed by git to the hook
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        hook_args: Vec<String>,
    },
}

fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "gitintel=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

#[tokio::main]
async fn main() -> ExitCode {
    init_tracing();

    let cli = Cli::parse();

    // If no subcommand, check if we're acting as git proxy
    if cli.command.is_none() && !cli.git_args.is_empty() {
        return proxy::run_git_proxy(&cli.git_args).await;
    }

    let result = match cli.command {
        Some(Commands::Init { force }) => init::run(force).await,

        Some(Commands::Checkpoint {
            agent,
            model,
            session_id,
            file,
            lines,
            tokens_in,
            tokens_out,
            cost_usd,
            transcript_ref,
        }) => {
            checkpoint::run(
                &agent,
                &model,
                &session_id,
                &file,
                &lines,
                tokens_in,
                tokens_out,
                cost_usd,
                transcript_ref.as_deref(),
            )
            .await
        }

        Some(Commands::Blame {
            file,
            commit,
            ai_only,
            human_only,
        }) => blame::run(&file, commit.as_deref(), ai_only, human_only).await,

        Some(Commands::Stats {
            developer,
            since,
            format,
        }) => stats::run(developer.as_deref(), &since, &format).await,

        Some(Commands::Cost {
            commit,
            branch,
            developer,
            since,
            format,
        }) => {
            cost::run(
                commit.as_deref(),
                branch.as_deref(),
                developer.as_deref(),
                since.as_deref(),
                &format,
            )
            .await
        }

        Some(Commands::Context { action }) => match action {
            ContextCommands::Init { output, force } => context::init::run(&output, force).await,
            ContextCommands::Optimize { input, apply } => {
                context::optimize::run(&input, apply).await
            }
            ContextCommands::Diff { input } => context::diff::run(&input).await,
        },

        Some(Commands::Memory { action }) => match action {
            MemoryCommands::Add {
                key,
                value,
                category,
            } => context::memory::add(&key, &value, &category).await,
            MemoryCommands::Get { key } => context::memory::get(&key).await,
            MemoryCommands::List { category } => context::memory::list(category.as_deref()).await,
            MemoryCommands::Prune {
                unused_days,
                dry_run,
            } => context::memory::prune(unused_days, dry_run).await,
            MemoryCommands::Export { format } => context::memory::export(&format).await,
            MemoryCommands::Stats => context::memory::stats().await,
        },

        Some(Commands::Sync { force, dry_run }) => sync::run(force, dry_run).await,

        Some(Commands::Hooks { action }) => match action {
            HookCommands::Install { force } => hooks::install(force).await,
            HookCommands::Uninstall => hooks::uninstall().await,
            HookCommands::Status => hooks::status().await,
            HookCommands::Run { hook_name, hook_args } => {
                hooks::run_hook(&hook_name, &hook_args).await
            }
        },

        Some(Commands::Config { json, set }) => config::run(json, set.as_deref()).await,

        Some(Commands::Update { check }) => update::run(check).await,

        None => {
            println!("{}", "GitIntel CLI - Git-native AI adoption tracking".green());
            println!();
            println!("Usage: gitintel <COMMAND>");
            println!();
            println!("Run 'gitintel --help' for more information.");
            Ok(())
        }
    };

    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("{}: {}", "Error".red().bold(), e);
            ExitCode::FAILURE
        }
    }
}
