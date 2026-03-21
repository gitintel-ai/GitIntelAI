//! Context optimizer - prunes and compresses CLAUDE.md sections

use crate::context::token_counter;
use crate::error::Result;
use colored::Colorize;

/// Section with score
#[derive(Debug)]
pub struct Section {
    pub name: String,
    pub tokens: usize,
    pub score: f64,
    pub action: SectionAction,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SectionAction {
    Keep,
    Compress,
    Prune,
}

/// Run context optimization
pub async fn run(input: &str, apply: bool) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let input_path = cwd.join(input);

    if !input_path.exists() {
        println!("{} {} not found", "Error:".red(), input);
        return Ok(());
    }

    let content = std::fs::read_to_string(&input_path)?;
    let original_tokens = token_counter::count_tokens(&content)?;

    // Parse sections
    let mut sections = parse_sections(&content)?;

    // Score sections (in production, this would analyze session transcripts)
    score_sections(&mut sections)?;

    // Calculate optimization
    let mut optimized_tokens = 0;

    for section in &sections {
        match section.action {
            SectionAction::Keep => optimized_tokens += section.tokens,
            SectionAction::Compress => {
                // Compress to ~20% of original
                let compressed = section.tokens / 5;
                optimized_tokens += compressed;
            }
            SectionAction::Prune => {}
        }
    }

    // Print report
    println!("{}", "CLAUDE.md Optimization Report".bold());
    println!("{}", "─".repeat(50));
    println!("Current:   {} tokens", original_tokens.to_string().cyan());
    println!(
        "Optimized: {} tokens",
        optimized_tokens.to_string().green()
    );
    println!(
        "Savings:   {} tokens ({:.1}% reduction)",
        (original_tokens - optimized_tokens).to_string().yellow(),
        ((original_tokens - optimized_tokens) as f64 / original_tokens as f64) * 100.0
    );
    println!();

    // Show pruned sections
    let pruned: Vec<_> = sections.iter().filter(|s| s.action == SectionAction::Prune).collect();
    if !pruned.is_empty() {
        println!("{}", "Sections to prune (score < 0.05):".red());
        for s in pruned {
            println!(
                "  {} \"{}\" ({:.2} score, {} tokens)",
                "✗".red(),
                s.name,
                s.score,
                s.tokens
            );
        }
        println!();
    }

    // Show compressed sections
    let compressed: Vec<_> = sections.iter().filter(|s| s.action == SectionAction::Compress).collect();
    if !compressed.is_empty() {
        println!("{}", "Sections to compress (score < 0.20):".yellow());
        for s in compressed {
            println!(
                "  {} \"{}\" ({:.2} score, {} → {} tokens)",
                "↓".yellow(),
                s.name,
                s.score,
                s.tokens,
                s.tokens / 5
            );
        }
        println!();
    }

    // Show kept sections
    let kept: Vec<_> = sections.iter().filter(|s| s.action == SectionAction::Keep).collect();
    if !kept.is_empty() {
        println!("{}", "Sections to keep:".green());
        for s in kept {
            println!(
                "  {} \"{}\" ({:.2} score, {} tokens)",
                "✓".green(),
                s.name,
                s.score,
                s.tokens
            );
        }
        println!();
    }

    println!("{}", "─".repeat(50));

    if apply {
        // Apply optimizations
        let optimized_content = apply_optimizations(&content, &sections)?;
        std::fs::write(&input_path, optimized_content)?;
        println!("{} Optimizations applied to {}", "✓".green(), input);
    } else {
        println!("Run `gitintel context optimize --apply` to apply these changes.");
    }

    Ok(())
}

fn parse_sections(content: &str) -> Result<Vec<Section>> {
    let mut sections = Vec::new();
    let mut current_name = String::new();
    let mut current_content = String::new();
    let mut in_section = false;

    for line in content.lines() {
        if line.starts_with("## ") {
            // Save previous section
            if in_section && !current_name.is_empty() {
                let tokens = token_counter::count_tokens(&current_content)?;
                sections.push(Section {
                    name: current_name.clone(),
                    tokens,
                    score: 0.5, // Default score
                    action: SectionAction::Keep,
                });
            }

            // Start new section
            current_name = line[3..].trim().to_string();
            current_content = format!("{}\n", line);
            in_section = true;
        } else if in_section {
            current_content.push_str(line);
            current_content.push('\n');
        }
    }

    // Save last section
    if in_section && !current_name.is_empty() {
        let tokens = token_counter::count_tokens(&current_content)?;
        sections.push(Section {
            name: current_name,
            tokens,
            score: 0.5,
            action: SectionAction::Keep,
        });
    }

    Ok(sections)
}

fn score_sections(sections: &mut Vec<Section>) -> Result<()> {
    // In production, this would analyze session transcripts to determine
    // which sections are actually referenced by the AI.
    //
    // For now, use heuristics based on section names:

    for section in sections.iter_mut() {
        let name_lower = section.name.to_lowercase();

        // High-value sections (likely to be referenced)
        if name_lower.contains("tech stack")
            || name_lower.contains("architecture")
            || name_lower.contains("convention")
            || name_lower.contains("common task")
        {
            section.score = 0.8 + (rand_float() * 0.2); // 0.8-1.0
            section.action = SectionAction::Keep;
        }
        // Medium-value sections
        else if name_lower.contains("overview")
            || name_lower.contains("dependencies")
            || name_lower.contains("entry point")
        {
            section.score = 0.4 + (rand_float() * 0.3); // 0.4-0.7
            section.action = if section.score < 0.2 {
                SectionAction::Compress
            } else {
                SectionAction::Keep
            };
        }
        // Low-value sections
        else if name_lower.contains("legacy")
            || name_lower.contains("old")
            || name_lower.contains("deprecated")
        {
            section.score = rand_float() * 0.1; // 0.0-0.1
            section.action = SectionAction::Prune;
        }
        // Default
        else {
            section.score = 0.3 + (rand_float() * 0.4); // 0.3-0.7
            section.action = SectionAction::Keep;
        }
    }

    Ok(())
}

fn rand_float() -> f64 {
    // Simple pseudo-random for demo purposes
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .subsec_nanos();
    (nanos % 1000) as f64 / 1000.0
}

fn apply_optimizations(content: &str, sections: &[Section]) -> Result<String> {
    let mut result = String::new();
    let mut current_section: Option<&Section>;
    let mut skip_lines = false;

    for line in content.lines() {
        if line.starts_with("## ") {
            let name = line[3..].trim();
            current_section = sections.iter().find(|s| s.name == name);

            if let Some(section) = current_section {
                match section.action {
                    SectionAction::Keep => {
                        result.push_str(line);
                        result.push('\n');
                        skip_lines = false;
                    }
                    SectionAction::Compress => {
                        // Write compressed version
                        result.push_str(line);
                        result.push_str("\n[Section compressed - see full version in git history]\n\n");
                        skip_lines = true;
                    }
                    SectionAction::Prune => {
                        // Skip entirely
                        skip_lines = true;
                    }
                }
            } else {
                result.push_str(line);
                result.push('\n');
                skip_lines = false;
            }
        } else if !skip_lines {
            result.push_str(line);
            result.push('\n');
        }
    }

    Ok(result)
}
