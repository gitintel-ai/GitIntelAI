//! Claude Code PostToolUse hook handler.
//!
//! Invoked as `gitintel hooks run claude-post-tool-use` from the PostToolUse
//! hook that `gitintel init` installs into `~/.claude/settings.json`.
//!
//! Claude Code writes the tool-use context as JSON to the hook's stdin.
//! This handler extracts the file path and session metadata, then calls
//! `gitintel checkpoint` to record the AI attribution.

use crate::error::Result;
use serde_json::Value;
use std::io::Read;

/// Read PostToolUse JSON from stdin and record a checkpoint.
/// Errors are swallowed so hook failures never break the developer's workflow.
pub async fn handle_post_tool_use() -> Result<()> {
    let mut buf = String::new();
    if std::io::stdin().read_to_string(&mut buf).is_err() {
        return Ok(());
    }

    let payload: Value = match serde_json::from_str(&buf) {
        Ok(v) => v,
        Err(_) => return Ok(()),
    };

    let tool_name = payload["tool_name"].as_str().unwrap_or("");
    let file_path = match tool_name {
        "Write" | "Edit" | "MultiEdit" => {
            payload["tool_input"]["file_path"]
                .as_str()
                .unwrap_or("")
                .to_string()
        }
        _ => return Ok(()),
    };

    if file_path.is_empty() {
        return Ok(());
    }

    let session_id = std::env::var("CLAUDE_CODE_SESSION_ID")
        .or_else(|_| std::env::var("CLAUDE_SESSION_ID"))
        .unwrap_or_else(|_| uuid::Uuid::new_v4().to_string());

    let model = std::env::var("CLAUDE_CODE_MODEL")
        .or_else(|_| std::env::var("CLAUDE_MODEL"))
        .unwrap_or_else(|_| "unknown".to_string());

    let lines = line_range_for(&file_path);

    let status = std::process::Command::new("gitintel")
        .args([
            "checkpoint",
            "--agent",
            "Claude Code",
            "--model",
            &model,
            "--session-id",
            &session_id,
            "--file",
            &file_path,
            "--lines",
            &lines,
        ])
        .status();

    if let Err(e) = status {
        tracing::warn!("gitintel checkpoint failed: {e}");
    }

    Ok(())
}

fn line_range_for(path: &str) -> String {
    match std::fs::read_to_string(path) {
        Ok(content) => format!("1-{}", content.lines().count().max(1)),
        Err(_) => "1-0".to_string(),
    }
}
