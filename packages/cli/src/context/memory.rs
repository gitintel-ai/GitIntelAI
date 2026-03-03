//! Memory store - persistent key-value facts about the codebase

use crate::context::token_counter;
use crate::error::Result;
use crate::store::{sqlite::Memory, Database};
use chrono::Utc;
use colored::Colorize;

/// Add a fact to memory
pub async fn add(key: &str, value: &str, category: &str) -> Result<()> {
    let db = Database::open()?;

    let token_count = token_counter::count_tokens(value)? as i32;

    let mem = Memory {
        key: key.to_string(),
        value: value.to_string(),
        category: category.to_string(),
        token_count,
        last_used_at: Utc::now(),
        use_count: 0,
        created_at: Utc::now(),
    };

    db.upsert_memory(&mem)?;

    println!(
        "{} Added memory: {} ({} tokens)",
        "✓".green(),
        key.cyan(),
        token_count
    );

    Ok(())
}

/// Get a fact from memory
pub async fn get(key: &str) -> Result<()> {
    let db = Database::open()?;

    if let Some(mem) = db.get_memory(key)? {
        // Update usage stats
        db.touch_memory(key)?;

        println!("{}: {}", key.cyan().bold(), mem.value);
        println!(
            "  Category: {} | Tokens: {} | Used: {} times",
            mem.category.dimmed(),
            mem.token_count,
            mem.use_count
        );
    } else {
        println!("{} Memory key not found: {}", "✗".red(), key);
    }

    Ok(())
}

/// List all memory facts
pub async fn list(category: Option<&str>) -> Result<()> {
    let db = Database::open()?;

    let memories = db.list_memory(category)?;

    if memories.is_empty() {
        println!("No memory entries found.");
        return Ok(());
    }

    println!("{}", "Memory Store".bold());
    if let Some(cat) = category {
        println!("Category: {}", cat.cyan());
    }
    println!("{}", "─".repeat(60));

    for mem in memories {
        println!(
            "{} [{}] ({} tokens, {} uses)",
            mem.key.cyan(),
            mem.category.dimmed(),
            mem.token_count,
            mem.use_count
        );
        println!("  {}", mem.value.dimmed());
        println!();
    }

    Ok(())
}

/// Prune unused memory facts
pub async fn prune(unused_days: u32, dry_run: bool) -> Result<()> {
    let db = Database::open()?;

    if dry_run {
        // Show what would be pruned
        let memories = db.list_memory(None)?;
        let cutoff = Utc::now() - chrono::Duration::days(unused_days as i64);

        let to_prune: Vec<_> = memories
            .iter()
            .filter(|m| m.last_used_at < cutoff && m.use_count == 0)
            .collect();

        if to_prune.is_empty() {
            println!("No memory entries to prune.");
        } else {
            println!(
                "Would prune {} entries (unused for {} days):",
                to_prune.len().to_string().yellow(),
                unused_days
            );
            for mem in to_prune {
                println!("  {} \"{}\"", "✗".red(), mem.key);
            }
        }
    } else {
        let pruned = db.prune_memory(unused_days)?;
        println!(
            "{} Pruned {} memory entries",
            "✓".green(),
            pruned.to_string().yellow()
        );
    }

    Ok(())
}

/// Export memory as CLAUDE.md section
pub async fn export(format: &str) -> Result<()> {
    let db = Database::open()?;
    let memories = db.list_memory(None)?;

    if memories.is_empty() {
        println!("No memory entries to export.");
        return Ok(());
    }

    match format {
        "yaml" => {
            println!("memories:");
            for mem in memories {
                println!("  - key: \"{}\"", mem.key);
                println!("    value: \"{}\"", mem.value.replace('"', "\\\""));
                println!("    category: \"{}\"", mem.category);
            }
        }
        "json" => {
            let json = serde_json::to_string_pretty(&memories)?;
            println!("{}", json);
        }
        _ => {
            // Markdown (default)
            println!("## Project Memory\n");
            println!("Key facts about this codebase:\n");

            // Group by category
            let mut by_category: std::collections::HashMap<String, Vec<&Memory>> =
                std::collections::HashMap::new();
            for mem in &memories {
                by_category
                    .entry(mem.category.clone())
                    .or_default()
                    .push(mem);
            }

            for (category, mems) in by_category {
                println!("### {}\n", category);
                for mem in mems {
                    println!("- **{}**: {}", mem.key, mem.value);
                }
                println!();
            }
        }
    }

    Ok(())
}

/// Show memory statistics
pub async fn stats() -> Result<()> {
    let db = Database::open()?;
    let (total, tokens, recent) = db.memory_stats()?;

    println!("{}", "Memory Store Statistics".bold());
    println!("{}", "─".repeat(40));
    println!("Total facts:       {}", total.to_string().cyan());
    println!("Total tokens:      {}", tokens.to_string().cyan());
    println!("Used in last 7d:   {}", recent.to_string().green());
    println!(
        "Unused:            {}",
        (total - recent).to_string().yellow()
    );

    Ok(())
}
