//! Prepare-commit-msg hook - adds cost summary to commit message

use crate::error::Result;
use crate::store::Database;
use std::fs;

/// Run prepare-commit-msg processing
pub async fn run(msg_file: &str) -> Result<()> {
    let db = Database::open()?;

    // Get pending checkpoints
    let checkpoints = db.get_pending_checkpoints()?;

    if checkpoints.is_empty() {
        return Ok(());
    }

    // Calculate totals
    let mut total_cost = 0.0f64;
    let mut total_lines = 0i32;
    let mut agents: std::collections::HashSet<String> = std::collections::HashSet::new();

    for cp in &checkpoints {
        total_cost += cp.cost_usd;
        total_lines += cp.line_end - cp.line_start + 1;
        agents.insert(cp.agent.clone());
    }

    // Read existing message
    let mut message = fs::read_to_string(msg_file)?;

    // Append cost footer
    message.push_str("\n\n---\n");
    message.push_str(&format!(
        "AI Assistance: {} lines | ${:.4} | {}\n",
        total_lines,
        total_cost,
        agents.into_iter().collect::<Vec<_>>().join(", ")
    ));

    // Write back
    fs::write(msg_file, message)?;

    Ok(())
}
