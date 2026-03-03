//! Checkpoint handling - receives AI agent line marks

use crate::error::{GitIntelError, Result};
use crate::store::{sqlite::Checkpoint, Database};
use chrono::Utc;
use colored::Colorize;
use uuid::Uuid;

/// Parse line ranges from a string like "12-45,78-103"
fn parse_line_ranges(lines: &str) -> Result<Vec<(i32, i32)>> {
    let mut ranges = Vec::new();

    for part in lines.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }

        let range_parts: Vec<&str> = part.split('-').collect();
        match range_parts.len() {
            1 => {
                let line: i32 = range_parts[0]
                    .parse()
                    .map_err(|_| GitIntelError::InvalidLineRange(part.to_string()))?;
                ranges.push((line, line));
            }
            2 => {
                let start: i32 = range_parts[0]
                    .parse()
                    .map_err(|_| GitIntelError::InvalidLineRange(part.to_string()))?;
                let end: i32 = range_parts[1]
                    .parse()
                    .map_err(|_| GitIntelError::InvalidLineRange(part.to_string()))?;
                ranges.push((start, end));
            }
            _ => return Err(GitIntelError::InvalidLineRange(part.to_string())),
        }
    }

    Ok(ranges)
}

/// Run the checkpoint command
pub async fn run(
    agent: &str,
    model: &str,
    session_id: &str,
    file: &str,
    lines: &str,
    tokens_in: u64,
    tokens_out: u64,
    cost_usd: f64,
    transcript_ref: Option<&str>,
) -> Result<()> {
    let db = Database::open()?;

    // Parse line ranges
    let ranges = parse_line_ranges(lines)?;

    // Create a checkpoint for each range
    for (line_start, line_end) in ranges {
        let checkpoint = Checkpoint {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.to_string(),
            agent: agent.to_string(),
            model: model.to_string(),
            file_path: file.to_string(),
            line_start,
            line_end,
            timestamp: Utc::now(),
            tokens_in: tokens_in as i64,
            tokens_out: tokens_out as i64,
            tokens_cache_read: 0,
            tokens_cache_write: 0,
            cost_usd,
            transcript_ref: transcript_ref.map(|s| s.to_string()),
        };

        db.insert_checkpoint(&checkpoint)?;
    }

    let total_lines: i32 = parse_line_ranges(lines)?
        .iter()
        .map(|(s, e)| e - s + 1)
        .sum();

    println!(
        "{} Checkpoint recorded: {} lines in {} ({} / {})",
        "✓".green(),
        total_lines,
        file.cyan(),
        agent.yellow(),
        model.dimmed()
    );

    if cost_usd > 0.0 {
        println!("  Cost: ${:.4}", cost_usd);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_line_ranges() {
        let ranges = parse_line_ranges("12-45,78-103").unwrap();
        assert_eq!(ranges, vec![(12, 45), (78, 103)]);

        let ranges = parse_line_ranges("10").unwrap();
        assert_eq!(ranges, vec![(10, 10)]);

        let ranges = parse_line_ranges("1-5, 10-15, 20-25").unwrap();
        assert_eq!(ranges, vec![(1, 5), (10, 15), (20, 25)]);
    }
}
