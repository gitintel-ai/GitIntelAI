//! Registry of known AI tool Co-Authored-By signatures
//!
//! Matches against both name and email portions of the trailer.
//! All matching is case-insensitive.

/// A known AI agent pattern
pub struct AgentPattern {
    /// Pattern to match (lowercased for comparison)
    pub pattern: &'static str,
    /// Canonical agent name
    pub agent_name: &'static str,
}

/// Registry of known AI coding agent signatures found in Co-Authored-By trailers.
///
/// Each entry matches against the full trailer value (name + email) case-insensitively.
pub static KNOWN_AGENTS: &[AgentPattern] = &[
    // Claude / Anthropic
    AgentPattern { pattern: "noreply@anthropic.com", agent_name: "Claude Code" },
    AgentPattern { pattern: "claude code", agent_name: "Claude Code" },
    AgentPattern { pattern: "claude sonnet", agent_name: "Claude" },
    AgentPattern { pattern: "claude opus", agent_name: "Claude" },
    AgentPattern { pattern: "claude haiku", agent_name: "Claude" },

    // GitHub Copilot
    AgentPattern { pattern: "copilot@github.com", agent_name: "GitHub Copilot" },
    AgentPattern { pattern: "github copilot", agent_name: "GitHub Copilot" },
    AgentPattern { pattern: "copilot[bot]", agent_name: "GitHub Copilot" },

    // Cursor
    AgentPattern { pattern: "cursor@cursor.com", agent_name: "Cursor" },
    AgentPattern { pattern: "cursor[bot]", agent_name: "Cursor" },
    AgentPattern { pattern: "cursor ai", agent_name: "Cursor" },

    // Amazon Q Developer (formerly CodeWhisperer)
    AgentPattern { pattern: "amazon q developer", agent_name: "Amazon Q Developer" },
    AgentPattern { pattern: "amazon q", agent_name: "Amazon Q Developer" },
    AgentPattern { pattern: "codewhisperer", agent_name: "Amazon Q Developer" },

    // Windsurf / Codeium
    AgentPattern { pattern: "windsurf", agent_name: "Windsurf" },
    AgentPattern { pattern: "codeium", agent_name: "Codeium" },
    AgentPattern { pattern: "codeium@codeium.com", agent_name: "Codeium" },

    // Gemini / Google
    AgentPattern { pattern: "gemini", agent_name: "Gemini" },
    AgentPattern { pattern: "google code assist", agent_name: "Google Code Assist" },
    AgentPattern { pattern: "code-assist@google.com", agent_name: "Google Code Assist" },

    // Devin
    AgentPattern { pattern: "devin", agent_name: "Devin" },
    AgentPattern { pattern: "devin-ai", agent_name: "Devin" },
    AgentPattern { pattern: "cognition.ai", agent_name: "Devin" },

    // OpenAI Codex
    AgentPattern { pattern: "openai codex", agent_name: "OpenAI Codex" },
    AgentPattern { pattern: "codex@openai.com", agent_name: "OpenAI Codex" },
    AgentPattern { pattern: "codex-cli", agent_name: "OpenAI Codex" },
];

/// Match a Co-Authored-By trailer value against known agents.
///
/// Returns `Some((agent_name, confidence))` if matched, `None` otherwise.
/// Confidence is 1.0 for email matches, 0.9 for name matches.
pub fn match_agent(trailer_value: &str) -> Option<(&'static str, f64)> {
    let lower = trailer_value.to_lowercase();

    for agent in KNOWN_AGENTS {
        if lower.contains(agent.pattern) {
            // Email matches get higher confidence
            let confidence = if agent.pattern.contains('@') { 1.0 } else { 0.9 };
            return Some((agent.agent_name, confidence));
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claude_code_email() {
        let result = match_agent("Claude Opus 4.6 (1M context) <noreply@anthropic.com>");
        assert!(result.is_some());
        let (name, confidence) = result.unwrap();
        assert_eq!(name, "Claude Code");
        assert_eq!(confidence, 1.0);
    }

    #[test]
    fn test_copilot() {
        let result = match_agent("GitHub Copilot <copilot@github.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "GitHub Copilot");
    }

    #[test]
    fn test_cursor() {
        let result = match_agent("Cursor AI <cursor@cursor.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Cursor");
    }

    #[test]
    fn test_case_insensitive() {
        let result = match_agent("CLAUDE CODE <NOREPLY@ANTHROPIC.COM>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Claude Code");
    }

    #[test]
    fn test_no_match() {
        let result = match_agent("John Doe <john@example.com>");
        assert!(result.is_none());
    }
}
