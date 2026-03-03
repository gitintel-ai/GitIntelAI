// GitIntel Core Constants

import type { ModelPricing } from "./types";

// ════════════════════════════════════════════════════════════════
// Model Pricing (per million tokens)
// ════════════════════════════════════════════════════════════════

export const MODEL_PRICING: ModelPricing[] = [
  // Anthropic Claude
  {
    model: "claude-opus-4-5",
    inputPerMtok: 15.0,
    outputPerMtok: 75.0,
    cacheWritePerMtok: 18.75,
    cacheReadPerMtok: 1.5,
  },
  {
    model: "claude-sonnet-4-5",
    inputPerMtok: 3.0,
    outputPerMtok: 15.0,
    cacheWritePerMtok: 3.75,
    cacheReadPerMtok: 0.3,
  },
  {
    model: "claude-haiku-3-5",
    inputPerMtok: 0.8,
    outputPerMtok: 4.0,
    cacheWritePerMtok: 1.0,
    cacheReadPerMtok: 0.08,
  },
  // OpenAI
  {
    model: "gpt-4o",
    inputPerMtok: 2.5,
    outputPerMtok: 10.0,
    cacheWritePerMtok: 0,
    cacheReadPerMtok: 1.25,
  },
  {
    model: "o3",
    inputPerMtok: 10.0,
    outputPerMtok: 40.0,
    cacheWritePerMtok: 0,
    cacheReadPerMtok: 2.5,
  },
  // Google
  {
    model: "gemini-2.0-flash",
    inputPerMtok: 0.075,
    outputPerMtok: 0.3,
    cacheWritePerMtok: 0,
    cacheReadPerMtok: 0,
  },
  {
    model: "gemini-2.5-pro",
    inputPerMtok: 1.25,
    outputPerMtok: 10.0,
    cacheWritePerMtok: 0,
    cacheReadPerMtok: 0.31,
  },
];

// ════════════════════════════════════════════════════════════════
// Default Configuration
// ════════════════════════════════════════════════════════════════

export const DEFAULT_CONFIG = {
  otel: {
    enabled: true,
    port: 4317,
  },
  cloudSync: {
    enabled: false,
    endpoint: "https://app.gitintel.com/api/v1",
  },
  cost: {
    currency: "USD",
    alertThresholdDaily: 10.0,
  },
};

// ════════════════════════════════════════════════════════════════
// Schema Version
// ════════════════════════════════════════════════════════════════

export const SCHEMA_VERSION = "gitintel/1.0.0";

// ════════════════════════════════════════════════════════════════
// Supported Agents
// ════════════════════════════════════════════════════════════════

export const SUPPORTED_AGENTS = [
  "Claude Code",
  "Cursor",
  "GitHub Copilot",
  "Codex",
  "Gemini Code Assist",
] as const;

export type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];
