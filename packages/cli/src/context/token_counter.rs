//! Token counter module - tiktoken-compatible token counting
//!
//! Note on accuracy: `tiktoken-rs` uses OpenAI's `cl100k_base` tokenizer.
//! For non-OpenAI models (Claude, Gemini), the true billed token count
//! typically differs by ±5-15%. This is acceptable for adoption/trend
//! analysis but not for invoice reconciliation. See `pricing.rs::disclaimer`.

use crate::error::Result;
use crate::pricing;

/// Count tokens in text (tiktoken-compatible)
pub fn count_tokens(text: &str) -> Result<usize> {
    // Use tiktoken-rs for accurate counting.
    // Fallback to 4-char approximation if tokenizer fails to load.
    let approx_tokens = text.len() / 4;

    match tiktoken_rs::cl100k_base() {
        Ok(bpe) => Ok(bpe.encode_with_special_tokens(text).len()),
        Err(_) => Ok(approx_tokens),
    }
}

/// Estimate cost for a combined token count against a model.
///
/// This helper is kept for call-site compatibility; it delegates to
/// `pricing::estimate_cost_combined` which applies a 70/30 input/output split.
/// For higher-fidelity estimates where input and output counts are known
/// separately, call `pricing::estimate_cost_typed` directly.
pub fn estimate_cost(tokens: usize, model: &str) -> f64 {
    pricing::estimate_cost_combined(tokens, model)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_tokens() {
        let text = "Hello, world! This is a test.";
        let count = count_tokens(text).unwrap();
        assert!(count > 0);
        assert!(count < 20); // Should be around 8-10 tokens
    }

    #[test]
    fn test_estimate_cost_runs() {
        // Just verify the plumbing works — exact values are covered in
        // `pricing::tests`.
        let cost = estimate_cost(1_000_000, "claude-sonnet");
        assert!(cost > 0.0);
        assert!(cost < 30.0);
    }
}
