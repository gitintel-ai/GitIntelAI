//! Git proxy - intercepts git commands to track AI attribution

use crate::config::Config;
use crate::error::Result;
use crate::hooks;
use std::process::{Command, ExitCode, Stdio};

/// Run the git proxy
pub async fn run_git_proxy(args: &[String]) -> ExitCode {
    match proxy_git(args).await {
        Ok(code) => code,
        Err(e) => {
            eprintln!("gitintel proxy error: {}", e);
            ExitCode::FAILURE
        }
    }
}

async fn proxy_git(args: &[String]) -> Result<ExitCode> {
    let config = Config::load()?;
    let git_path = &config.git_path;

    // Determine the git subcommand
    let subcommand = args.first().map(|s| s.as_str());

    // Run pre-processing hooks
    match subcommand {
        Some("commit") => {
            // Pre-commit processing
            hooks::run_pre_commit().await?;
        }
        Some("push") => {
            // Ensure we push AI attribution refs
            run_git_with_refs_push(&config, args).await?;
            return Ok(ExitCode::SUCCESS);
        }
        Some("fetch") => {
            // Ensure we fetch AI attribution refs
            run_git_with_refs_fetch(&config, args).await?;
            return Ok(ExitCode::SUCCESS);
        }
        _ => {}
    }

    // Run the actual git command
    let status = Command::new(git_path)
        .args(args)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;

    // Run post-processing hooks
    if status.success() {
        match subcommand {
            Some("commit") => {
                // Post-commit processing - write attribution log
                hooks::run_post_commit().await?;
            }
            Some("rebase") => {
                // Rebase processing - reapply attribution notes
                hooks::run_post_rewrite("rebase").await?;
            }
            Some("merge") => {
                // Merge processing - combine attribution logs
                hooks::run_post_merge().await?;
            }
            _ => {}
        }
    }

    Ok(if status.success() {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(status.code().unwrap_or(1) as u8)
    })
}

/// Run git push with additional refs for AI attribution
async fn run_git_with_refs_push(config: &Config, args: &[String]) -> Result<()> {
    // First, run the regular push
    let status = Command::new(&config.git_path)
        .args(args)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;

    if !status.success() {
        return Ok(());
    }

    // Then push AI attribution refs
    // git push origin refs/ai/authorship/*:refs/ai/authorship/*
    let remote = get_remote_from_args(args).unwrap_or("origin");

    let _ = Command::new(&config.git_path)
        .args([
            "push",
            remote,
            "refs/ai/authorship/*:refs/ai/authorship/*",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();

    Ok(())
}

/// Run git fetch with additional refs for AI attribution
async fn run_git_with_refs_fetch(config: &Config, args: &[String]) -> Result<()> {
    // First, run the regular fetch
    let status = Command::new(&config.git_path)
        .args(args)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;

    if !status.success() {
        return Ok(());
    }

    // Then fetch AI attribution refs
    let remote = get_remote_from_args(args).unwrap_or("origin");

    let _ = Command::new(&config.git_path)
        .args([
            "fetch",
            remote,
            "refs/ai/authorship/*:refs/ai/authorship/*",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();

    Ok(())
}

/// Extract remote name from git args
fn get_remote_from_args(args: &[String]) -> Option<&str> {
    // Skip the subcommand (push/fetch) and look for non-flag arguments
    for arg in args.iter().skip(1) {
        if !arg.starts_with('-') {
            return Some(arg.as_str());
        }
    }
    None
}
