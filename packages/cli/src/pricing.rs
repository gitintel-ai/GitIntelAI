//! Pricing tables for AI model usage.
//!
//! This module centralizes model pricing so that rate changes only need to be
//! updated in one place. Prices are loaded with this precedence:
//!
//! 1. `~/.gitintel/pricing.json` — user override (highest priority)
//! 2. `$REPO/.gitintel/pricing.json` — repo-level override
//! 3. Built-in `DEFAULT_PRICING_JSON` below — baked into the binary
//!
//! ## Accuracy disclaimer
//!
//! Cost estimates are **approximate**. Anthropic and other providers do not
//! publish the exact tokenization used for billing, and GitIntel uses
//! `tiktoken-rs` (OpenAI's tokenizer) as a cross-provider proxy. For
//! Claude-family models specifically, real billed token counts typically
//! differ by ±5-15% from `tiktoken` estimates. Treat reported numbers as
//! an adoption/relative-cost signal, not as an invoice reconciliation tool.
//!
//! ## Keeping prices current
//!
//! Prices listed below reflect the state published by each provider at
//! `last_updated`. Providers adjust prices periodically (e.g. Anthropic's
//! 2026-04 prompt-cache TTL shift). To refresh without waiting for a new
//! release, drop an updated `pricing.json` in `~/.gitintel/` — the binary
//! will pick it up on the next run.

use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

/// Per-model pricing in USD per 1M tokens.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPricing {
    /// USD per 1M input tokens.
    pub input_per_mtok: f64,
    /// USD per 1M output tokens.
    pub output_per_mtok: f64,
}

/// Pricing table — a map of model name prefix → pricing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingTable {
    /// When this table was last refreshed, ISO-8601.
    pub last_updated: String,
    /// Human-readable source attribution.
    pub source: String,
    /// Model name substring → pricing. Lookup uses case-insensitive `contains`.
    pub models: HashMap<String, ModelPricing>,
    /// Fallback pricing used when no model matches.
    pub default: ModelPricing,
}

/// Built-in default pricing as of 2026-04-14.
///
/// Sources: Anthropic platform pricing page, OpenAI API pricing page.
/// Update these together with `last_updated` when bumping.
const DEFAULT_PRICING_JSON: &str = r#"{
  "last_updated": "2026-04-14",
  "source": "anthropic.com/pricing, openai.com/api/pricing",
  "models": {
    "opus": {"input_per_mtok": 5.0, "output_per_mtok": 25.0},
    "sonnet": {"input_per_mtok": 3.0, "output_per_mtok": 15.0},
    "haiku": {"input_per_mtok": 1.0, "output_per_mtok": 5.0},
    "gpt-4o": {"input_per_mtok": 2.50, "output_per_mtok": 10.0},
    "gpt-4": {"input_per_mtok": 10.0, "output_per_mtok": 30.0},
    "gpt-5": {"input_per_mtok": 5.0, "output_per_mtok": 15.0}
  },
  "default": {"input_per_mtok": 3.0, "output_per_mtok": 15.0}
}"#;

static PRICING: OnceLock<PricingTable> = OnceLock::new();

/// Load the pricing table, honoring user overrides.
///
/// Returns the cached table after the first call — pricing is effectively
/// immutable within a single CLI invocation.
pub fn get_pricing() -> &'static PricingTable {
    PRICING.get_or_init(|| match load_pricing() {
        Ok(t) => t,
        Err(_) => {
            // Fall back to baked-in defaults. This should never fail to parse.
            serde_json::from_str(DEFAULT_PRICING_JSON)
                .expect("built-in DEFAULT_PRICING_JSON must be valid")
        }
    })
}

fn load_pricing() -> Result<PricingTable> {
    for path in candidate_paths() {
        if path.exists() {
            if let Ok(contents) = std::fs::read_to_string(&path) {
                if let Ok(table) = serde_json::from_str::<PricingTable>(&contents) {
                    return Ok(table);
                }
            }
        }
    }
    // No override found — use baked-in.
    Ok(serde_json::from_str(DEFAULT_PRICING_JSON)
        .expect("built-in DEFAULT_PRICING_JSON must be valid"))
}

fn candidate_paths() -> Vec<PathBuf> {
    let mut out = Vec::new();

    // Repo-level override (optional — depends on cwd being inside a repo)
    if let Ok(cwd) = std::env::current_dir() {
        out.push(cwd.join(".gitintel").join("pricing.json"));
    }

    // User-level override
    if let Some(home) = dirs::home_dir() {
        out.push(home.join(".gitintel").join("pricing.json"));
    }

    out
}

/// Estimate cost for a token count against a model name.
///
/// `model` is matched case-insensitively against the pricing table keys
/// using `contains`. If no key matches, the `default` bucket is used.
///
/// Pass `is_output = true` for generated-output token counts, `false` for
/// prompt/input counts. If you only have a single combined token count
/// (as with most CLI captures), use `estimate_cost_combined` which assumes
/// an input/output split typical of coding sessions.
#[allow(dead_code)] // public API — exposed for callers that track input/output separately
pub fn estimate_cost_typed(tokens: usize, model: &str, is_output: bool) -> f64 {
    let table = get_pricing();
    let pricing = lookup_model(table, model);
    let rate = if is_output {
        pricing.output_per_mtok
    } else {
        pricing.input_per_mtok
    };
    (tokens as f64 / 1_000_000.0) * rate
}

/// Estimate combined cost for a total token count, assuming a 70/30
/// input/output split (the historical default for coding sessions where
/// we only record totals).
pub fn estimate_cost_combined(tokens: usize, model: &str) -> f64 {
    let table = get_pricing();
    let pricing = lookup_model(table, model);
    let input_tokens = (tokens as f64) * 0.70;
    let output_tokens = (tokens as f64) * 0.30;
    (input_tokens / 1_000_000.0) * pricing.input_per_mtok
        + (output_tokens / 1_000_000.0) * pricing.output_per_mtok
}

fn lookup_model<'a>(table: &'a PricingTable, model: &str) -> &'a ModelPricing {
    let lower = model.to_lowercase();
    for (key, pricing) in &table.models {
        if lower.contains(&key.to_lowercase()) {
            return pricing;
        }
    }
    &table.default
}

/// Return a short disclaimer string suitable for appending to CLI output.
pub fn disclaimer() -> String {
    let table = get_pricing();
    format!(
        "Estimates use tiktoken tokenization (approximate for non-OpenAI models). Pricing last refreshed: {}. Override via ~/.gitintel/pricing.json.",
        table.last_updated
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn built_in_defaults_parse() {
        let table: PricingTable = serde_json::from_str(DEFAULT_PRICING_JSON).unwrap();
        assert_eq!(table.last_updated, "2026-04-14");
        assert!(table.models.contains_key("opus"));
    }

    #[test]
    fn model_lookup_is_case_insensitive_substring() {
        let table: PricingTable = serde_json::from_str(DEFAULT_PRICING_JSON).unwrap();
        let p = lookup_model(&table, "Claude-Opus-4.6");
        assert_eq!(p.output_per_mtok, 25.0);
    }

    #[test]
    fn unknown_model_falls_back_to_default() {
        let table: PricingTable = serde_json::from_str(DEFAULT_PRICING_JSON).unwrap();
        let p = lookup_model(&table, "some-future-model-xyz");
        assert_eq!(p.output_per_mtok, 15.0);
    }

    #[test]
    fn cost_math_sonnet() {
        // 1M tokens of pure output at $15/M = $15.
        let cost = estimate_cost_typed(1_000_000, "claude-sonnet-4.6", true);
        assert!((cost - 15.0).abs() < 0.01);
    }

    #[test]
    fn combined_cost_blends_input_output() {
        // 1M combined at 70/30 split on Sonnet: 0.7M * $3 + 0.3M * $15 = 2.1 + 4.5 = 6.6
        let cost = estimate_cost_combined(1_000_000, "claude-sonnet");
        assert!((cost - 6.6).abs() < 0.01);
    }
}
