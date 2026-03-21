//! AI-aware blame command - extends git blame with AI/Human attribution

use crate::config::Config;
use crate::error::{GitIntelError, Result};
use crate::store::Database;
use colored::Colorize;
use serde::Deserialize;
use std::collections::HashMap;
use std::process::Command;

/// Attribution type for a line
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum LineAttribution {
    Human,
    AI,
    Mixed,
    Unknown,
}

impl std::fmt::Display for LineAttribution {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LineAttribution::Human => write!(f, "H"),
            LineAttribution::AI => write!(f, "A"),
            LineAttribution::Mixed => write!(f, "M"),
            LineAttribution::Unknown => write!(f, "?"),
        }
    }
}

/// A single line from blame output
#[derive(Debug)]
pub struct BlameLine {
    pub commit_sha: String,
    pub author: String,
    pub line_number: usize,
    pub content: String,
    pub attribution: LineAttribution,
}

/// Run the blame command
pub async fn run(
    file: &str,
    commit: Option<&str>,
    ai_only: bool,
    human_only: bool,
) -> Result<()> {
    let config = Config::load()?;

    // Run git blame to get base output
    let mut cmd = Command::new(&config.git_path);
    cmd.args(["blame", "--porcelain"]);

    if let Some(c) = commit {
        cmd.arg(c);
    }

    cmd.arg("--").arg(file);

    let output = cmd.output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(GitIntelError::Other(format!("git blame failed: {}", stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let blame_lines = parse_porcelain_blame(&stdout)?;

    // Load AI attribution data from git notes
    let attribution_map = load_attribution_map(&config, file)?;

    // Build a set of commit SHAs that have checkpoint-based attribution for this file
    let checkpoint_shas: std::collections::HashSet<String> = attribution_map
        .keys()
        .map(|(sha, _)| sha.clone())
        .collect();

    // Collect unique commit SHAs from blame output to check against scanned_attributions
    let blame_shas: std::collections::HashSet<String> = blame_lines
        .iter()
        .map(|l| l.commit_sha.clone())
        .collect();

    // Look up which commits are in scanned_attributions (trailer-detected AI commits)
    let mut scanned_shas: std::collections::HashSet<String> = std::collections::HashSet::new();
    let db = Database::open()?;
    for sha in &blame_shas {
        if !checkpoint_shas.contains(sha) {
            if let Ok(Some(_)) = db.get_scanned_attribution(sha) {
                scanned_shas.insert(sha.clone());
            }
        }
    }

    // Display results
    println!(
        "{} {} ({} lines)",
        "AI Blame:".cyan().bold(),
        file,
        blame_lines.len()
    );
    println!("{}", "─".repeat(80));

    for mut line in blame_lines {
        // Apply attribution from our checkpoint data
        if let Some(attr) = attribution_map.get(&(line.commit_sha.clone(), line.line_number)) {
            line.attribution = *attr;
        } else if scanned_shas.contains(&line.commit_sha) {
            // Commit was detected as AI-assisted via Co-Authored-By trailer
            // but no line-level checkpoint data exists — mark as AI*
            line.attribution = LineAttribution::AI;
        }

        // Determine if this line's attribution came from scan (trailer) detection
        let is_scanned = scanned_shas.contains(&line.commit_sha)
            && !attribution_map.contains_key(&(line.commit_sha.clone(), line.line_number));

        // Filter based on flags
        if ai_only && line.attribution != LineAttribution::AI {
            continue;
        }
        if human_only && line.attribution != LineAttribution::Human {
            continue;
        }

        // Color based on attribution; use [AI*] for trailer-detected lines
        let attr_color = match line.attribution {
            LineAttribution::AI if is_scanned => format!("[{}]", "AI*".blue()),
            LineAttribution::AI => format!("[{}]", "AI".blue()),
            LineAttribution::Human => format!("[{}]", "HU".green()),
            LineAttribution::Mixed => format!("[{}]", "MX".yellow()),
            LineAttribution::Unknown => format!("[{}]", "??".dimmed()),
        };

        println!(
            "{:>4} {} {:>8} {} {}",
            line.line_number.to_string().dimmed(),
            attr_color,
            &line.commit_sha[..8].dimmed(),
            line.author.dimmed(),
            line.content
        );
    }

    Ok(())
}

/// Parse git blame --porcelain output
fn parse_porcelain_blame(output: &str) -> Result<Vec<BlameLine>> {
    let mut lines = Vec::new();
    let mut current_sha = String::new();
    let mut current_author = String::new();
    let mut current_line_num = 0;

    for line in output.lines() {
        if line.starts_with('\t') {
            // This is the actual content line
            lines.push(BlameLine {
                commit_sha: current_sha.clone(),
                author: current_author.clone(),
                line_number: current_line_num,
                content: line[1..].to_string(),
                attribution: LineAttribution::Unknown,
            });
        } else if line.len() >= 40 && line.chars().take(40).all(|c| c.is_ascii_hexdigit()) {
            // This is a commit line
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                current_sha = parts[0].to_string();
                current_line_num = parts[2].parse().unwrap_or(0);
            }
        } else if let Some(author) = line.strip_prefix("author ") {
            current_author = author.to_string();
        }
    }

    Ok(lines)
}

/// Serde types for the gitintel/1.0.0 authorship YAML stored in git notes
#[derive(Debug, Deserialize)]
struct AuthorshipLog {
    #[serde(default)]
    agent_sessions: Vec<AgentSession>,
}

#[derive(Debug, Deserialize)]
struct AgentSession {
    #[serde(default)]
    files: HashMap<String, FileLineRanges>,
}

#[derive(Debug, Deserialize)]
struct FileLineRanges {
    #[serde(default)]
    ai_lines: Vec<[usize; 2]>,
    #[serde(default)]
    human_lines: Vec<[usize; 2]>,
}

/// Load attribution map from git notes
fn load_attribution_map(
    config: &Config,
    file: &str,
) -> Result<HashMap<(String, usize), LineAttribution>> {
    let mut map = HashMap::new();

    // Try to read attribution notes
    let output = Command::new(&config.git_path)
        .args(["notes", "--ref=refs/ai/authorship", "list"])
        .output()?;

    if !output.status.success() {
        // No notes exist yet
        return Ok(map);
    }

    // Parse notes and build attribution map
    // Format: <note-sha> <commit-sha>
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let commit_sha = parts[1];

            // Read the note content
            if let Ok(note_output) = Command::new(&config.git_path)
                .args(["notes", "--ref=refs/ai/authorship", "show", commit_sha])
                .output()
            {
                if note_output.status.success() {
                    let note_content = String::from_utf8_lossy(&note_output.stdout);
                    if let Ok(entries) = parse_authorship_log(&note_content, file) {
                        for (line_num, attr) in entries {
                            map.insert((commit_sha.to_string(), line_num), attr);
                        }
                    }
                }
            }
        }
    }

    Ok(map)
}

/// Parse authorship log YAML and extract per-line attribution for the given file.
///
/// The YAML stores line ranges under `agent_sessions[*].files.<path>.{ai_lines,human_lines}`.
/// Each range is `[start, end]` (1-based, inclusive). This function expands all ranges
/// into individual (line_number, LineAttribution) pairs. When a line appears in both
/// `ai_lines` and `human_lines` across sessions it is marked Mixed.
fn parse_authorship_log(content: &str, file: &str) -> Result<Vec<(usize, LineAttribution)>> {
    let log: AuthorshipLog = serde_yaml::from_str(content)
        .map_err(|e| GitIntelError::Other(format!("authorship YAML parse error: {e}")))?;

    // Accumulate votes per line number: true = AI, false = Human
    let mut ai_lines: std::collections::HashSet<usize> = std::collections::HashSet::new();
    let mut human_lines: std::collections::HashSet<usize> = std::collections::HashSet::new();

    for session in &log.agent_sessions {
        // Match by exact key or by path suffix (handles relative vs absolute paths)
        let file_attr = session.files.get(file).or_else(|| {
            session
                .files
                .iter()
                .find(|(k, _)| k.ends_with(file) || file.ends_with(k.as_str()))
                .map(|(_, v)| v)
        });

        if let Some(attr) = file_attr {
            for [start, end] in &attr.ai_lines {
                for n in *start..=*end {
                    ai_lines.insert(n);
                }
            }
            for [start, end] in &attr.human_lines {
                for n in *start..=*end {
                    human_lines.insert(n);
                }
            }
        }
    }

    let mut results = Vec::new();
    let all_lines: std::collections::BTreeSet<usize> =
        ai_lines.iter().chain(human_lines.iter()).copied().collect();

    for n in all_lines {
        let attr = match (ai_lines.contains(&n), human_lines.contains(&n)) {
            (true, true) => LineAttribution::Mixed,
            (true, false) => LineAttribution::AI,
            (false, true) => LineAttribution::Human,
            (false, false) => unreachable!(),
        };
        results.push((n, attr));
    }

    Ok(results)
}
