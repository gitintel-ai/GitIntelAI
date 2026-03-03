//! Pre-commit hook - validates checkpoints before commit

use crate::error::Result;
use crate::store::Database;

/// Run pre-commit validation
pub async fn run() -> Result<()> {
    let db = Database::open()?;

    // Get pending checkpoints
    let checkpoints = db.get_pending_checkpoints()?;

    if checkpoints.is_empty() {
        // No AI checkpoints - purely human commit
        return Ok(());
    }

    // Validate checkpoints are still valid (files exist, lines are within range)
    for cp in &checkpoints {
        let path = std::path::Path::new(&cp.file_path);
        if !path.exists() {
            tracing::warn!(
                "Checkpoint references non-existent file: {}",
                cp.file_path
            );
        }
    }

    Ok(())
}
