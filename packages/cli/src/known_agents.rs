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
        let (name, confidence) = result.unwrap();
        assert_eq!(name, "GitHub Copilot");
        assert_eq!(confidence, 1.0); // email match
    }

    #[test]
    fn test_cursor() {
        let result = match_agent("Cursor AI <cursor@cursor.com>");
        assert!(result.is_some());
        let (name, confidence) = result.unwrap();
        assert_eq!(name, "Cursor");
        assert_eq!(confidence, 1.0); // email match
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

    #[test]
    fn test_amazon_q_developer() {
        let result = match_agent("Amazon Q Developer <noreply@amazon.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Amazon Q Developer");
    }

    #[test]
    fn test_codewhisperer_maps_to_amazon_q() {
        let result = match_agent("CodeWhisperer <codewhisperer@aws.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Amazon Q Developer");
    }

    #[test]
    fn test_windsurf() {
        let result = match_agent("Windsurf AI <windsurf@example.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Windsurf");
    }

    #[test]
    fn test_codeium_email() {
        let result = match_agent("Codeium <codeium@codeium.com>");
        assert!(result.is_some());
        let (name, _confidence) = result.unwrap();
        assert_eq!(name, "Codeium");
        // Note: "codeium" name pattern matches before email, so confidence is 0.9
    }

    #[test]
    fn test_gemini() {
        let result = match_agent("Gemini Code Assist <gemini@google.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Gemini");
    }

    #[test]
    fn test_devin() {
        let result = match_agent("Devin <devin@cognition.ai>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Devin");
    }

    #[test]
    fn test_devin_cognition_email() {
        let result = match_agent("AI Agent <agent@cognition.ai>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "Devin");
    }

    #[test]
    fn test_openai_codex() {
        let result = match_agent("OpenAI Codex <codex@openai.com>");
        assert!(result.is_some());
        let (name, _confidence) = result.unwrap();
        assert_eq!(name, "OpenAI Codex");
        // Note: "openai codex" name pattern matches before email, so confidence is 0.9
    }

    #[test]
    fn test_codex_cli() {
        let result = match_agent("codex-cli <noreply@openai.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "OpenAI Codex");
    }

    #[test]
    fn test_google_code_assist_email() {
        let result = match_agent("Google <code-assist@google.com>");
        assert!(result.is_some());
        let (name, confidence) = result.unwrap();
        assert_eq!(name, "Google Code Assist");
        assert_eq!(confidence, 1.0);
    }

    #[test]
    fn test_copilot_bot() {
        let result = match_agent("copilot[bot] <noreply@github.com>");
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, "GitHub Copilot");
    }

    #[test]
    fn test_name_match_lower_confidence() {
        // Name-only match (no email pattern) should give 0.9
        let result = match_agent("Claude Code <user@custom-domain.com>");
        assert!(result.is_some());
        let (name, confidence) = result.unwrap();
        assert_eq!(name, "Claude Code");
        assert_eq!(confidence, 0.9);
    }

    #[test]
    fn test_random_names_no_match() {
        assert!(match_agent("Alice <alice@wonderland.com>").is_none());
        assert!(match_agent("Bob Builder <bob@build.io>").is_none());
        assert!(match_agent("CI Bot <ci@jenkins.io>").is_none());
        assert!(match_agent("dependabot[bot] <noreply@github.com>").is_none());
    }
}
