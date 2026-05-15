//! Claude Code session reader.
//!
//! Claude Code writes one JSONL file per session under
//! `~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl`. The encoded-cwd
//! directory name replaces path separators and the drive-letter colon with
//! `-` (Windows: `C--Users-aruno-workspace-foo`), but each assistant line
//! also carries the real `cwd` field, so we read `cwd` from the JSON rather
//! than reversing the directory name.
//!
//! Lines of interest:
//!
//! - `type: "assistant"` — has `message.usage.{input_tokens, output_tokens,
//!   cache_creation_input_tokens, cache_read_input_tokens, speed}` plus a
//!   `model` and a `content` array containing `tool_use` blocks. One
//!   `ParsedCall` per assistant line.
//! - `type: "user"` — grabbed to attach `user_message` text to the next
//!   assistant call in the same session (for the keyword-refinement pass
//!   of the classifier).
//! - everything else (queue-operation, hook-attachments, …) — skipped.
//!
//! Parse failures on a single line are logged and skipped, never fatal —
//! one bad line should not break a git commit.

use super::types::{ParsedCall, SessionSource};
use super::SessionProvider;
use crate::error::Result;
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

const PROVIDER_NAME: &str = "Claude Code";

pub struct ClaudeProvider;

impl SessionProvider for ClaudeProvider {
    fn name(&self) -> &'static str {
        PROVIDER_NAME
    }

    fn discover(&self) -> Vec<SessionSource> {
        let Some(home) = dirs::home_dir() else {
            return Vec::new();
        };
        let projects_dir = home.join(".claude").join("projects");
        if !projects_dir.exists() {
            return Vec::new();
        }

        let mut sources = Vec::new();
        // One sub-directory per project. Each directory holds zero or more
        // `<uuid>.jsonl` session files at its root.
        let Ok(entries) = std::fs::read_dir(&projects_dir) else {
            return sources;
        };

        for entry in entries.flatten() {
            let project_dir = entry.path();
            if !project_dir.is_dir() {
                continue;
            }
            let project_hint = decode_project_dir(&project_dir);
            let Ok(files) = std::fs::read_dir(&project_dir) else {
                continue;
            };
            for f in files.flatten() {
                let p = f.path();
                if p.extension().and_then(|s| s.to_str()) == Some("jsonl") {
                    sources.push(SessionSource::new(PROVIDER_NAME, &p, project_hint.clone()));
                }
            }
        }
        sources
    }

    fn parse(&self, source: &SessionSource) -> Result<Vec<ParsedCall>> {
        let file = File::open(&source.path)?;
        let reader = BufReader::new(file);
        let mut calls = Vec::new();
        let mut last_user_text: Option<String> = None;

        for (lineno, line) in reader.lines().enumerate() {
            let Ok(line) = line else {
                continue;
            };
            if line.trim().is_empty() {
                continue;
            }
            let v: Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(e) => {
                    tracing::debug!(
                        path = %source.path.display(),
                        lineno = lineno + 1,
                        error = %e,
                        "skipping malformed Claude session line"
                    );
                    continue;
                }
            };

            match v.get("type").and_then(|t| t.as_str()) {
                Some("user") => {
                    if let Some(text) = extract_user_text(&v) {
                        last_user_text = Some(text);
                    }
                }
                Some("assistant") => {
                    if let Some(mut call) = parse_assistant(&v) {
                        if call.user_message.is_none() {
                            call.user_message = last_user_text.clone();
                        }
                        calls.push(call);
                    }
                }
                _ => {}
            }
        }
        Ok(calls)
    }
}

fn parse_assistant(v: &Value) -> Option<ParsedCall> {
    let message = v.get("message")?;
    let usage = message.get("usage")?;
    let model = message.get("model").and_then(|m| m.as_str())?.to_string();
    if model == "<synthetic>" {
        // Synthetic assistant messages (rate-limit notices, etc.) have no
        // billable tokens; skip them rather than pollute the rollup.
        return None;
    }
    let timestamp_str = v.get("timestamp").and_then(|t| t.as_str())?;
    let timestamp = DateTime::parse_from_rfc3339(timestamp_str)
        .ok()?
        .with_timezone(&Utc);

    let input_tokens = usage
        .get("input_tokens")
        .and_then(|n| n.as_i64())
        .unwrap_or(0);
    let output_tokens = usage
        .get("output_tokens")
        .and_then(|n| n.as_i64())
        .unwrap_or(0);
    let cache_read_tokens = usage
        .get("cache_read_input_tokens")
        .and_then(|n| n.as_i64())
        .unwrap_or(0);
    let cache_write_tokens = usage
        .get("cache_creation_input_tokens")
        .and_then(|n| n.as_i64())
        .unwrap_or(0);
    let web_search_requests = usage
        .pointer("/server_tool_use/web_search_requests")
        .and_then(|n| n.as_i64())
        .unwrap_or(0);
    let speed = usage
        .get("speed")
        .and_then(|s| s.as_str())
        .unwrap_or("standard")
        .to_string();

    // No usage at all? Skip — nothing to bill.
    if input_tokens == 0 && output_tokens == 0 && cache_read_tokens == 0 && cache_write_tokens == 0
    {
        return None;
    }

    let session_id = v
        .get("sessionId")
        .and_then(|s| s.as_str())
        .unwrap_or("unknown")
        .to_string();

    let project_path = v.get("cwd").and_then(|c| c.as_str()).map(PathBuf::from);

    let mut tools: Vec<String> = Vec::new();
    if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
        for block in content {
            if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                if let Some(name) = block.get("name").and_then(|n| n.as_str()) {
                    tools.push(name.to_string());
                }
            }
        }
    }

    // Pull Bash command strings out of any Bash tool_use blocks so the
    // classifier can distinguish git from build from test.
    let mut bash_commands: Vec<String> = Vec::new();
    if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
        for block in content {
            if block.get("type").and_then(|t| t.as_str()) == Some("tool_use")
                && block
                    .get("name")
                    .and_then(|n| n.as_str())
                    .map(|n| n.eq_ignore_ascii_case("Bash") || n.eq_ignore_ascii_case("PowerShell"))
                    .unwrap_or(false)
            {
                if let Some(cmd) = block.pointer("/input/command").and_then(|c| c.as_str()) {
                    bash_commands.push(cmd.to_string());
                }
            }
        }
    }

    Some(ParsedCall {
        provider: PROVIDER_NAME.to_string(),
        session_id,
        model,
        timestamp,
        input_tokens,
        output_tokens,
        cache_read_tokens,
        cache_write_tokens,
        web_search_requests,
        speed,
        tools,
        bash_commands,
        user_message: None,
        project_path,
        cost_is_estimated: false,
    })
}

fn extract_user_text(v: &Value) -> Option<String> {
    // Claude user messages either have `message.content` as a string or as
    // an array of `{type: "text", text: "..."}` blocks.
    let message = v.get("message")?;
    let content = message.get("content")?;
    if let Some(s) = content.as_str() {
        return Some(s.to_string());
    }
    if let Some(arr) = content.as_array() {
        let mut buf = String::new();
        for block in arr {
            if block.get("type").and_then(|t| t.as_str()) == Some("text") {
                if let Some(t) = block.get("text").and_then(|t| t.as_str()) {
                    if !buf.is_empty() {
                        buf.push('\n');
                    }
                    buf.push_str(t);
                }
            }
        }
        if !buf.is_empty() {
            return Some(buf);
        }
    }
    None
}

fn decode_project_dir(dir: &Path) -> Option<PathBuf> {
    // Best-effort: Claude encodes cwd path separators as `-`. On Windows
    // `C:\Users\foo` → `C--Users-foo`. Reversal is ambiguous (any `-` in
    // the real path becomes indistinguishable from a separator), so we
    // only set this as a hint — the per-message `cwd` field is the
    // authoritative source. Returning None forces parse() to fall back to
    // the in-file `cwd`.
    let name = dir.file_name()?.to_string_lossy();
    if !name.contains("--") && !name.contains('-') {
        return None;
    }
    // Don't try to reconstruct — too lossy. Hand back None.
    let _ = name;
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn fixture_line(input_tokens: i64, output_tokens: i64, ts: &str) -> String {
        format!(
            r#"{{"type":"assistant","timestamp":"{ts}","sessionId":"sess-1","cwd":"C:\\Users\\foo\\repo","message":{{"model":"claude-opus-4-7","usage":{{"input_tokens":{input_tokens},"output_tokens":{output_tokens},"cache_read_input_tokens":0,"cache_creation_input_tokens":0,"speed":"standard"}},"content":[{{"type":"tool_use","name":"Edit","input":{{}}}}]}}}}"#
        )
    }

    #[test]
    fn parse_handles_well_formed_assistant_line() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("x.jsonl");
        let mut f = File::create(&path).unwrap();
        writeln!(f, "{}", fixture_line(100, 50, "2026-05-15T10:00:00Z")).unwrap();
        writeln!(f, "{}", fixture_line(200, 30, "2026-05-15T10:01:00Z")).unwrap();
        drop(f);

        let src = SessionSource::new(PROVIDER_NAME, &path, None);
        let calls = ClaudeProvider.parse(&src).unwrap();
        assert_eq!(calls.len(), 2);
        assert_eq!(calls[0].input_tokens, 100);
        assert_eq!(calls[1].output_tokens, 30);
        assert_eq!(calls[0].session_id, "sess-1");
        assert_eq!(calls[0].model, "claude-opus-4-7");
        assert_eq!(calls[0].tools, vec!["Edit".to_string()]);
        assert!(calls[0].project_path.is_some());
    }

    #[test]
    fn parse_skips_synthetic_and_zero_usage() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("x.jsonl");
        let mut f = File::create(&path).unwrap();
        // Synthetic line (rate-limit notice) — must be skipped.
        writeln!(f, r#"{{"type":"assistant","timestamp":"2026-05-15T10:00:00Z","sessionId":"s","cwd":"/x","message":{{"model":"<synthetic>","usage":{{"input_tokens":0,"output_tokens":0}}}}}}"#).unwrap();
        // Zero-token line — also skipped.
        writeln!(f, r#"{{"type":"assistant","timestamp":"2026-05-15T10:01:00Z","sessionId":"s","cwd":"/x","message":{{"model":"claude-opus-4-7","usage":{{"input_tokens":0,"output_tokens":0,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}}}}}"#).unwrap();
        // Real line — kept.
        writeln!(f, "{}", fixture_line(10, 5, "2026-05-15T10:02:00Z")).unwrap();
        drop(f);

        let src = SessionSource::new(PROVIDER_NAME, &path, None);
        let calls = ClaudeProvider.parse(&src).unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].input_tokens, 10);
    }

    #[test]
    fn parse_attaches_prior_user_message() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("x.jsonl");
        let mut f = File::create(&path).unwrap();
        writeln!(f, r#"{{"type":"user","timestamp":"2026-05-15T10:00:00Z","sessionId":"s","message":{{"content":"please refactor the login module"}}}}"#).unwrap();
        writeln!(f, "{}", fixture_line(10, 5, "2026-05-15T10:00:30Z")).unwrap();
        drop(f);

        let src = SessionSource::new(PROVIDER_NAME, &path, None);
        let calls = ClaudeProvider.parse(&src).unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(
            calls[0].user_message.as_deref(),
            Some("please refactor the login module")
        );
    }

    #[test]
    fn parse_tolerates_malformed_lines() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("x.jsonl");
        let mut f = File::create(&path).unwrap();
        writeln!(f, "this is not json").unwrap();
        writeln!(f, "{}", fixture_line(7, 3, "2026-05-15T10:00:00Z")).unwrap();
        writeln!(f, r#"{{"missing":"fields"}}"#).unwrap();
        drop(f);

        let src = SessionSource::new(PROVIDER_NAME, &path, None);
        let calls = ClaudeProvider.parse(&src).unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].input_tokens, 7);
    }

    #[test]
    fn discover_returns_empty_when_no_claude_dir() {
        // Hard to override HOME here without leaking state; just confirm
        // the function doesn't panic and returns a Vec.
        let _ = ClaudeProvider.discover();
    }

    #[test]
    fn parse_extracts_bash_commands_from_tool_use_input() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("x.jsonl");
        let mut f = File::create(&path).unwrap();
        let line = r#"{"type":"assistant","timestamp":"2026-05-15T10:00:00Z","sessionId":"s","cwd":"/x","message":{"model":"claude-opus-4-7","usage":{"input_tokens":1,"output_tokens":1},"content":[{"type":"tool_use","name":"Bash","input":{"command":"git push origin main"}}]}}"#;
        writeln!(f, "{}", line).unwrap();
        drop(f);

        let src = SessionSource::new(PROVIDER_NAME, &path, None);
        let calls = ClaudeProvider.parse(&src).unwrap();
        assert_eq!(
            calls[0].bash_commands,
            vec!["git push origin main".to_string()]
        );
    }
}
