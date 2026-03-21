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

    let lines = line_range_for(&file_path, tool_name, &payload);

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

fn line_range_for(path: &str, tool_name: &str, payload: &Value) -> String {
    let fallback = || -> String {
        match std::fs::read_to_string(path) {
            Ok(content) => format!("1-{}", content.lines().count().max(1)),
            Err(_) => "1-0".to_string(),
        }
    };

    match tool_name {
        "Edit" => line_range_for_edit(path, payload).unwrap_or_else(fallback),
        "MultiEdit" => line_range_for_multi_edit(path, payload).unwrap_or_else(fallback),
        "Write" => line_range_for_write(path).unwrap_or_else(fallback),
        _ => fallback(),
    }
}

/// For Edit tool: find where `new_string` landed in the file and return its line range.
fn line_range_for_edit(path: &str, payload: &Value) -> Option<String> {
    let new_string = payload["tool_input"]["new_string"].as_str()?;
    if new_string.is_empty() {
        // Deletion — old_string was removed, nothing new to attribute
        return Some("0-0".to_string());
    }
    let content = std::fs::read_to_string(path).ok()?;
    find_substring_line_range(&content, new_string)
}

/// For MultiEdit tool: process each edit entry and return comma-separated ranges.
fn line_range_for_multi_edit(path: &str, payload: &Value) -> Option<String> {
    let edits = payload["tool_input"]["edits"].as_array()?;
    let content = std::fs::read_to_string(path).ok()?;

    let mut ranges: Vec<String> = Vec::new();
    for edit in edits {
        let new_string = edit["new_string"].as_str().unwrap_or("");
        if new_string.is_empty() {
            continue; // deletion, skip
        }
        if let Some(r) = find_substring_line_range(&content, new_string) {
            ranges.push(r);
        }
    }

    if ranges.is_empty() {
        Some("0-0".to_string())
    } else {
        Some(ranges.join(","))
    }
}

/// For Write tool: if the file is new, return all lines. If it existed before,
/// diff against the git HEAD version and return only changed line ranges.
fn line_range_for_write(path: &str) -> Option<String> {
    let new_content = std::fs::read_to_string(path).ok()?;
    let total_lines = new_content.lines().count().max(1);

    // Try to get the old version from git
    let relative_path = git_relative_path(path)?;
    let old_output = std::process::Command::new("git")
        .args(["show", &format!("HEAD:{relative_path}")])
        .output()
        .ok()?;

    if !old_output.status.success() {
        // File didn't exist before — entire file is AI-written
        return Some(format!("1-{total_lines}"));
    }

    let old_content = String::from_utf8(old_output.stdout).ok()?;
    let changed = diff_changed_lines(&old_content, &new_content);
    if changed.is_empty() {
        Some("0-0".to_string())
    } else {
        Some(ranges_to_string(&changed))
    }
}

/// Find the line range of `needle` within `haystack`. Returns "start-end" (1-indexed).
fn find_substring_line_range(haystack: &str, needle: &str) -> Option<String> {
    let byte_offset = haystack.find(needle)?;
    let start_line = haystack[..byte_offset].lines().count().max(1);
    // If the prefix ends with a newline, the match starts on the next line
    let start_line = if byte_offset > 0 && haystack.as_bytes()[byte_offset - 1] == b'\n' {
        start_line + 1
    } else {
        start_line
    };
    let needle_line_count = needle.lines().count().max(1);
    let end_line = start_line + needle_line_count - 1;
    Some(format!("{start_line}-{end_line}"))
}

/// Get a file's path relative to the git repo root.
fn git_relative_path(abs_path: &str) -> Option<String> {
    // Normalize path separators for git
    let normalized = abs_path.replace('\\', "/");

    let output = std::process::Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let root = String::from_utf8(output.stdout).ok()?;
    let root = root.trim().replace('\\', "/");

    // Strip the repo root prefix to get a relative path
    let rel = if let Some(stripped) = normalized.strip_prefix(&root) {
        stripped.trim_start_matches('/')
    } else {
        // Fallback: just use the filename
        normalized.rsplit('/').next()?
    };

    Some(rel.to_string())
}

/// Compare old and new content line-by-line and return 1-indexed line numbers
/// of lines that changed or were added in the new content.
fn diff_changed_lines(old: &str, new: &str) -> Vec<usize> {
    let old_lines: Vec<&str> = old.lines().collect();
    let new_lines: Vec<&str> = new.lines().collect();
    let mut changed = Vec::new();

    for (i, new_line) in new_lines.iter().enumerate() {
        let line_num = i + 1; // 1-indexed
        match old_lines.get(i) {
            Some(old_line) if old_line == new_line => {} // unchanged
            _ => changed.push(line_num),                 // changed or added
        }
    }

    changed
}

/// Convert a sorted list of line numbers into compact range strings.
/// e.g. [1, 2, 3, 7, 8, 12] -> "1-3,7-8,12-12"
fn ranges_to_string(lines: &[usize]) -> String {
    if lines.is_empty() {
        return "0-0".to_string();
    }

    let mut ranges: Vec<String> = Vec::new();
    let mut start = lines[0];
    let mut end = lines[0];

    for &line in &lines[1..] {
        if line == end + 1 {
            end = line;
        } else {
            ranges.push(format!("{start}-{end}"));
            start = line;
            end = line;
        }
    }
    ranges.push(format!("{start}-{end}"));
    ranges.join(",")
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- find_substring_line_range tests ---

    #[test]
    fn test_find_substring_at_start() {
        let haystack = "hello\nworld\nfoo";
        let result = find_substring_line_range(haystack, "hello");
        assert_eq!(result, Some("1-1".to_string()));
    }

    #[test]
    fn test_find_substring_middle_line() {
        let haystack = "line1\nline2\nline3\nline4";
        let result = find_substring_line_range(haystack, "line2");
        assert_eq!(result, Some("2-2".to_string()));
    }

    #[test]
    fn test_find_substring_multiline_needle() {
        let haystack = "aaa\nbbb\nccc\nddd\neee";
        let result = find_substring_line_range(haystack, "ccc\nddd");
        assert_eq!(result, Some("3-4".to_string()));
    }

    #[test]
    fn test_find_substring_not_found() {
        let haystack = "aaa\nbbb\nccc";
        let result = find_substring_line_range(haystack, "zzz");
        assert_eq!(result, None);
    }

    #[test]
    fn test_find_substring_entire_file() {
        let haystack = "only line";
        let result = find_substring_line_range(haystack, "only line");
        assert_eq!(result, Some("1-1".to_string()));
    }

    // --- diff_changed_lines tests ---

    #[test]
    fn test_diff_no_changes() {
        let old = "aaa\nbbb\nccc";
        let new = "aaa\nbbb\nccc";
        assert!(diff_changed_lines(old, new).is_empty());
    }

    #[test]
    fn test_diff_one_line_changed() {
        let old = "aaa\nbbb\nccc";
        let new = "aaa\nBBB\nccc";
        assert_eq!(diff_changed_lines(old, new), vec![2]);
    }

    #[test]
    fn test_diff_lines_added() {
        let old = "aaa\nbbb";
        let new = "aaa\nbbb\nccc\nddd";
        assert_eq!(diff_changed_lines(old, new), vec![3, 4]);
    }

    #[test]
    fn test_diff_all_changed() {
        let old = "aaa\nbbb";
        let new = "xxx\nyyy";
        assert_eq!(diff_changed_lines(old, new), vec![1, 2]);
    }

    #[test]
    fn test_diff_empty_old() {
        let old = "";
        let new = "aaa\nbbb";
        assert_eq!(diff_changed_lines(old, new), vec![1, 2]);
    }

    // --- ranges_to_string tests ---

    #[test]
    fn test_ranges_consecutive() {
        assert_eq!(ranges_to_string(&[1, 2, 3, 4, 5]), "1-5");
    }

    #[test]
    fn test_ranges_with_gaps() {
        assert_eq!(ranges_to_string(&[1, 2, 3, 7, 8, 12]), "1-3,7-8,12-12");
    }

    #[test]
    fn test_ranges_single_element() {
        assert_eq!(ranges_to_string(&[42]), "42-42");
    }

    #[test]
    fn test_ranges_empty() {
        assert_eq!(ranges_to_string(&[]), "0-0");
    }

    #[test]
    fn test_ranges_all_isolated() {
        assert_eq!(ranges_to_string(&[1, 5, 10]), "1-1,5-5,10-10");
    }
}
