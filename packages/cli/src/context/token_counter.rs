//! Token counter module - tiktoken-compatible token counting

use crate::error::Result;

/// Count tokens in text (tiktoken-compatible)
pub fn count_tokens(text: &str) -> Result<usize> {
    // Use tiktoken-rs for accurate counting
    // For now, use a simple approximation (4 chars per token average)
    let approx_tokens = text.len() / 4;

    // Try to use tiktoken if available
    match tiktoken_rs::cl100k_base() {
        Ok(bpe) => Ok(bpe.encode_with_special_tokens(text).len()),
        Err(_) => Ok(approx_tokens),
    }
}

/// Estimate cost for tokens
pub fn estimate_cost(tokens: usize, model: &str) -> f64 {
    // Per million token pricing
    let price_per_mtok = match model {
        m if m.contains("opus") => 15.0,
        m if m.contains("sonnet") => 3.0,
        m if m.contains("haiku") => 0.80,
        m if m.contains("gpt-4") => 2.50,
        _ => 3.0, // default to sonnet pricing
    };

    (tokens as f64 / 1_000_000.0) * price_per_mtok
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
    fn test_estimate_cost() {
        let cost = estimate_cost(1_000_000, "claude-sonnet");
        assert!((cost - 3.0).abs() < 0.01);
    }
}
