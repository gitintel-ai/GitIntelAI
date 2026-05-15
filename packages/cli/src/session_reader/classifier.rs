//! 13-category task classifier — pure logic, no LLM calls.
//!
//! Ported from codeburn's `src/classifier.ts` two-pass design:
//!
//! 1. **Tool-pattern pass** — examine which tools the assistant used in the
//!    turn (Edit, Bash, Read, Grep, Agent, etc.) and what Bash subcommand
//!    pattern the shell calls match. Classify into a coarse category.
//! 2. **Keyword refinement pass** — if the coarse category is `Coding`,
//!    re-examine the user message for refactor / feature / debug keywords.
//!    Earliest-match wins (order-dependent tie-break, identical to
//!    codeburn).
//!
//! Every regex compiles on first use via `OnceLock`. Patterns are matched
//! case-insensitively against `bash_commands` and `user_text`.

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

/// The 13 categories codeburn deems sufficient to describe an AI coding
/// session. Order chosen to match codeburn's `TaskCategory` union for
/// portability of future fixtures.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TaskCategory {
    Coding,
    Debugging,
    Feature,
    Refactoring,
    Testing,
    Exploration,
    Planning,
    Delegation,
    Git,
    BuildDeploy,
    Conversation,
    Brainstorming,
    General,
}

impl TaskCategory {
    /// Stable string form for SQLite + YAML serialization. Matches the
    /// lowercase tokens codeburn uses, so downstream JSON exports stay
    /// interoperable if we ever align outputs.
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskCategory::Coding => "coding",
            TaskCategory::Debugging => "debugging",
            TaskCategory::Feature => "feature",
            TaskCategory::Refactoring => "refactoring",
            TaskCategory::Testing => "testing",
            TaskCategory::Exploration => "exploration",
            TaskCategory::Planning => "planning",
            TaskCategory::Delegation => "delegation",
            TaskCategory::Git => "git",
            TaskCategory::BuildDeploy => "build/deploy",
            TaskCategory::Conversation => "conversation",
            TaskCategory::Brainstorming => "brainstorming",
            TaskCategory::General => "general",
        }
    }
}

/// Classify one turn from its tool calls, bash commands, and user message.
///
/// - `tools` — names of tools the assistant invoked this turn (e.g.
///   `["Edit", "Bash", "Read"]`).
/// - `bash_commands` — concrete shell commands run via the Bash tool, used
///   to distinguish git ops from builds from tests.
/// - `user_text` — the prompting user message. Used by the keyword pass to
///   refine `Coding` into refactor / feature / debugging.
pub fn classify_turn(tools: &[String], bash_commands: &[String], user_text: &str) -> TaskCategory {
    let coarse = classify_by_tool_pattern(tools, bash_commands);
    if matches!(coarse, TaskCategory::Coding) {
        refine_by_keywords(user_text).unwrap_or(coarse)
    } else {
        coarse
    }
}

fn classify_by_tool_pattern(tools: &[String], bash_commands: &[String]) -> TaskCategory {
    if tools.is_empty() {
        return classify_conversation();
    }

    let has = |name: &str| tools.iter().any(|t| t.eq_ignore_ascii_case(name));

    // Planning beats everything — explicit signal.
    if has("EnterPlanMode") || has("TaskCreate") || has("TaskUpdate") {
        return TaskCategory::Planning;
    }
    // Delegation = spawning sub-agents.
    if has("Agent") || has("Task") {
        return TaskCategory::Delegation;
    }

    let has_edits = has("Edit") || has("Write") || has("MultiEdit") || has("NotebookEdit");
    let has_bash = has("Bash") || has("PowerShell");
    let has_reads = has("Read") || has("Glob") || has("Grep");
    let has_search = has("WebSearch") || has("WebFetch") || has("Grep") || has("Glob");
    let has_mcp = tools.iter().any(|t| t.starts_with("mcp__"));

    if has_edits && (has_bash || !has_reads) {
        return TaskCategory::Coding;
    }
    if has_bash && !has_edits {
        if any_match(bash_commands, git_patterns()) {
            return TaskCategory::Git;
        }
        if any_match(bash_commands, build_patterns()) {
            return TaskCategory::BuildDeploy;
        }
        if any_match(bash_commands, test_patterns()) {
            return TaskCategory::Testing;
        }
        return TaskCategory::Coding;
    }
    if (has_search || has_mcp) && !has_edits {
        return TaskCategory::Exploration;
    }
    if has_edits {
        return TaskCategory::Coding;
    }

    TaskCategory::General
}

fn classify_conversation() -> TaskCategory {
    // No tools — could be brainstorm or pure conversation. Without text we
    // can't tell; default to Conversation. The caller can override via
    // keyword refinement when text is available, but our refinement only
    // fires for Coding today (codeburn parity).
    TaskCategory::Conversation
}

fn refine_by_keywords(user_text: &str) -> Option<TaskCategory> {
    if user_text.is_empty() {
        return None;
    }

    // Earliest-match wins across the three keyword buckets — same as
    // codeburn's `firstMatchingCategory`. We compute the leftmost match
    // index per bucket and take the smallest one.
    let candidates: [(TaskCategory, &[&str]); 3] = [
        (TaskCategory::Refactoring, refactor_keywords()),
        (TaskCategory::Feature, feature_keywords()),
        (TaskCategory::Debugging, debug_keywords()),
    ];

    let lower = user_text.to_lowercase();
    let mut best: Option<(usize, TaskCategory)> = None;
    for (cat, kws) in candidates {
        for kw in kws {
            if let Some(idx) = lower.find(kw) {
                match best {
                    Some((b, _)) if idx >= b => {}
                    _ => best = Some((idx, cat)),
                }
            }
        }
    }
    best.map(|(_, c)| c)
}

fn any_match(commands: &[String], patterns: &[&'static regex::Regex]) -> bool {
    commands.iter().any(|cmd| {
        let lower = cmd.to_lowercase();
        patterns.iter().any(|p| p.is_match(&lower))
    })
}

fn refactor_keywords() -> &'static [&'static str] {
    &[
        "refactor",
        "rename",
        "simplify",
        "extract method",
        "extract function",
        "cleanup",
        "clean up",
    ]
}

fn feature_keywords() -> &'static [&'static str] {
    &[
        "add",
        "create",
        "implement",
        "build",
        "new feature",
        "new endpoint",
        "support for",
        "introduce",
    ]
}

fn debug_keywords() -> &'static [&'static str] {
    &[
        "fix",
        "bug",
        "broken",
        "doesn't work",
        "doesnt work",
        "not working",
        "error",
        "crash",
        "regression",
        "stack trace",
        "traceback",
    ]
}

fn git_patterns() -> &'static [&'static regex::Regex] {
    static REGEXES: OnceLock<Vec<regex::Regex>> = OnceLock::new();
    static REF_VEC: OnceLock<Vec<&'static regex::Regex>> = OnceLock::new();
    REF_VEC.get_or_init(|| {
        let regs = REGEXES.get_or_init(|| {
            vec![
                regex::Regex::new(r"\bgit\s+(push|commit|merge|rebase|checkout|branch|fetch|pull|stash|cherry-pick)\b").unwrap(),
                regex::Regex::new(r"\bgh\s+(pr|issue|repo|api|run|release|workflow)\b").unwrap(),
            ]
        });
        regs.iter().collect()
    })
}

fn build_patterns() -> &'static [&'static regex::Regex] {
    static REGEXES: OnceLock<Vec<regex::Regex>> = OnceLock::new();
    static REF_VEC: OnceLock<Vec<&'static regex::Regex>> = OnceLock::new();
    REF_VEC.get_or_init(|| {
        let regs = REGEXES.get_or_init(|| {
            vec![
                regex::Regex::new(r"\b(npm|yarn|pnpm|bun)\s+(build|run\s+build)\b").unwrap(),
                regex::Regex::new(r"\bdocker\s+(build|compose|run|push)\b").unwrap(),
                regex::Regex::new(
                    r"\b(cargo\s+build|cargo\s+publish|pm2\s+|vercel\s+|firebase\s+deploy)\b",
                )
                .unwrap(),
                regex::Regex::new(r"\b(make\b|tsc\b|webpack|vite\s+build|next\s+build)").unwrap(),
            ]
        });
        regs.iter().collect()
    })
}

fn test_patterns() -> &'static [&'static regex::Regex] {
    static REGEXES: OnceLock<Vec<regex::Regex>> = OnceLock::new();
    static REF_VEC: OnceLock<Vec<&'static regex::Regex>> = OnceLock::new();
    REF_VEC.get_or_init(|| {
        let regs = REGEXES.get_or_init(|| {
            vec![
                regex::Regex::new(
                    r"\b(pytest|vitest|jest|mocha|cargo\s+test|go\s+test|phpunit|rspec)\b",
                )
                .unwrap(),
                regex::Regex::new(r"\bnpm\s+(test|run\s+test)\b").unwrap(),
            ]
        });
        regs.iter().collect()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn planning_wins_over_edits() {
        assert_eq!(
            classify_turn(&s(&["EnterPlanMode", "Edit"]), &[], ""),
            TaskCategory::Planning
        );
    }

    #[test]
    fn delegation_on_agent_tool() {
        assert_eq!(
            classify_turn(&s(&["Agent"]), &[], ""),
            TaskCategory::Delegation
        );
    }

    #[test]
    fn coding_on_edit_alone() {
        assert_eq!(
            classify_turn(&s(&["Edit", "Read"]), &[], ""),
            TaskCategory::Coding
        );
    }

    #[test]
    fn exploration_on_search_without_edits() {
        assert_eq!(
            classify_turn(&s(&["Grep", "Read", "WebSearch"]), &[], ""),
            TaskCategory::Exploration
        );
    }

    #[test]
    fn git_on_bash_git_push() {
        assert_eq!(
            classify_turn(&s(&["Bash"]), &s(&["git push origin main"]), ""),
            TaskCategory::Git
        );
    }

    #[test]
    fn build_on_npm_build() {
        assert_eq!(
            classify_turn(&s(&["Bash"]), &s(&["npm run build"]), ""),
            TaskCategory::BuildDeploy
        );
    }

    #[test]
    fn testing_on_cargo_test() {
        assert_eq!(
            classify_turn(&s(&["Bash"]), &s(&["cargo test --all"]), ""),
            TaskCategory::Testing
        );
    }

    #[test]
    fn refactor_keyword_wins_over_feature() {
        // "refactor" appears at idx 0, "add" at idx 22 — refactor wins.
        let cat = classify_turn(
            &s(&["Edit"]),
            &[],
            "Refactor the auth module and add a unit test",
        );
        assert_eq!(cat, TaskCategory::Refactoring);
    }

    #[test]
    fn feature_keyword_when_earliest() {
        let cat = classify_turn(
            &s(&["Edit"]),
            &[],
            "Add OAuth support — also refactor login.ts later",
        );
        assert_eq!(cat, TaskCategory::Feature);
    }

    #[test]
    fn debug_keyword_picked() {
        let cat = classify_turn(
            &s(&["Edit"]),
            &[],
            "Fix the bug where checkout crashes on empty cart",
        );
        assert_eq!(cat, TaskCategory::Debugging);
    }

    #[test]
    fn no_tools_classifies_as_conversation() {
        assert_eq!(
            classify_turn(&[], &[], "any text"),
            TaskCategory::Conversation
        );
    }

    #[test]
    fn unknown_tool_falls_through_to_general() {
        assert_eq!(
            classify_turn(&s(&["SomeUnknownTool"]), &[], ""),
            TaskCategory::General
        );
    }

    #[test]
    fn mcp_tool_treated_as_exploration() {
        assert_eq!(
            classify_turn(&s(&["mcp__kite__get_quotes"]), &[], ""),
            TaskCategory::Exploration
        );
    }
}
