//! Post-rewrite hook - reapplies attribution notes after rebase/merge

use crate::config::Config;
use crate::error::Result;
use std::io::BufRead;
use std::process::Command;

/// Run post-rewrite processing
pub async fn run(cause: &str) -> Result<()> {
    let config = Config::load()?;

    match cause {
        "rebase" => handle_rebase(&config).await,
        "amend" => handle_amend(&config).await,
        "merge" => handle_merge(&config).await,
        _ => Ok(()),
    }
}

/// Handle rebase - reapply notes from old SHAs to new SHAs
async fn handle_rebase(config: &Config) -> Result<()> {
    // Read old-sha new-sha pairs from stdin
    let stdin = std::io::stdin();
    let reader = stdin.lock();

    for line in reader.lines() {
        let line = line?;
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() >= 2 {
            let old_sha = parts[0];
            let new_sha = parts[1];

            // Copy attribution note from old to new commit
            if let Ok(note_output) = Command::new(&config.git_path)
                .args(["notes", "--ref=refs/ai/authorship", "show", old_sha])
                .output()
            {
                if note_output.status.success() {
                    let note_content = String::from_utf8_lossy(&note_output.stdout);
                    let _ = Command::new(&config.git_path)
                        .args(["notes", "--ref=refs/ai/authorship", "add", "-f", "-m", &note_content, new_sha])
                        .status();
                }
            }
        }
    }

    Ok(())
}

/// Handle amend - copy note to amended commit
async fn handle_amend(config: &Config) -> Result<()> {
    // Read the old-sha new-sha from stdin
    let stdin = std::io::stdin();
    let reader = stdin.lock();

    for line in reader.lines() {
        let line = line?;
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() >= 2 {
            let old_sha = parts[0];
            let new_sha = parts[1];

            // Copy note
            if let Ok(note_output) = Command::new(&config.git_path)
                .args(["notes", "--ref=refs/ai/authorship", "show", old_sha])
                .output()
            {
                if note_output.status.success() {
                    let note_content = String::from_utf8_lossy(&note_output.stdout);
                    let _ = Command::new(&config.git_path)
                        .args(["notes", "--ref=refs/ai/authorship", "add", "-f", "-m", &note_content, new_sha])
                        .status();
                }
            }
        }
    }

    Ok(())
}

/// Handle merge - combine attribution logs from merge parents
async fn handle_merge(config: &Config) -> Result<()> {
    // Get merge commit (HEAD)
    let output = Command::new(&config.git_path)
        .args(["rev-parse", "HEAD"])
        .output()?;
    let merge_sha = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Get parent commits
    let output = Command::new(&config.git_path)
        .args(["rev-parse", "HEAD^1", "HEAD^2"])
        .output()?;
    let parents_raw = String::from_utf8_lossy(&output.stdout).into_owned();
    let parents: Vec<&str> = parents_raw
        .lines()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();

    // Collect notes from parents
    let mut combined_notes = String::new();
    combined_notes.push_str("# Combined attribution from merge\n");
    combined_notes.push_str(&format!("merge_commit: {}\n", merge_sha));
    combined_notes.push_str("parents:\n");

    for parent in parents {
        if let Ok(note_output) = Command::new(&config.git_path)
            .args(["notes", "--ref=refs/ai/authorship", "show", parent])
            .output()
        {
            if note_output.status.success() {
                combined_notes.push_str(&format!("  - sha: {}\n", parent));
                let note = String::from_utf8_lossy(&note_output.stdout);
                for line in note.lines() {
                    combined_notes.push_str(&format!("    {}\n", line));
                }
            }
        }
    }

    // Write combined note to merge commit
    let _ = Command::new(&config.git_path)
        .args(["notes", "--ref=refs/ai/authorship", "add", "-f", "-m", &combined_notes, &merge_sha])
        .status();

    Ok(())
}
