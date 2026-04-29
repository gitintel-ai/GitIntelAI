//! Context diff - shows token delta report

use crate::context::token_counter;
use crate::error::Result;
use colored::Colorize;
use std::cmp::Reverse;

/// Show token diff report
pub async fn run(input: &str) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let input_path = cwd.join(input);

    if !input_path.exists() {
        println!("{} {} not found", "Error:".red(), input);
        return Ok(());
    }

    let content = std::fs::read_to_string(&input_path)?;
    let total_tokens = token_counter::count_tokens(&content)?;

    println!("{}", "CLAUDE.md Token Analysis".bold());
    println!("{}", "─".repeat(50));
    println!("File: {}", input.cyan());
    println!("Total tokens: {}", total_tokens.to_string().yellow());
    println!();

    // Break down by section
    println!("{}", "Token breakdown by section:".bold());

    let mut in_section = false;
    let mut current_section = String::new();
    let mut current_content = String::new();
    let mut section_tokens = Vec::new();

    for line in content.lines() {
        if let Some(name) = line.strip_prefix("## ") {
            if in_section && !current_section.is_empty() {
                let tokens = token_counter::count_tokens(&current_content)?;
                section_tokens.push((current_section.clone(), tokens));
            }
            current_section = name.trim().to_string();
            current_content = format!("{}\n", line);
            in_section = true;
        } else if in_section {
            current_content.push_str(line);
            current_content.push('\n');
        }
    }

    // Last section
    if in_section && !current_section.is_empty() {
        let tokens = token_counter::count_tokens(&current_content)?;
        section_tokens.push((current_section, tokens));
    }

    // Sort by token count descending
    section_tokens.sort_by_key(|(_, tokens)| Reverse(*tokens));

    // Display
    for (name, tokens) in &section_tokens {
        let pct = (*tokens as f64 / total_tokens as f64) * 100.0;
        let bar_len = (pct / 5.0).round() as usize;
        let bar = "█".repeat(bar_len);

        println!(
            "  {:30} {:>5} tokens ({:>5.1}%) {}",
            name.dimmed(),
            tokens.to_string().cyan(),
            pct,
            bar.blue()
        );
    }

    println!();
    println!("{}", "─".repeat(50));

    // Cost estimates
    println!("{}", "Estimated context cost per session:".bold());
    let opus_cost = token_counter::estimate_cost(total_tokens, "opus");
    let sonnet_cost = token_counter::estimate_cost(total_tokens, "sonnet");
    let haiku_cost = token_counter::estimate_cost(total_tokens, "haiku");

    println!("  Claude Opus:   ${:.4}", opus_cost);
    println!("  Claude Sonnet: ${:.4}", sonnet_cost);
    println!("  Claude Haiku:  ${:.4}", haiku_cost);

    Ok(())
}
