import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, MODEL_PRICING, SCHEMA_VERSION, SUPPORTED_AGENTS } from "../constants";

// ════════════════════════════════════════════════════════════════
// MODEL_PRICING
// ════════════════════════════════════════════════════════════════

describe("MODEL_PRICING", () => {
  test("is a non-empty array", () => {
    expect(Array.isArray(MODEL_PRICING)).toBe(true);
    expect(MODEL_PRICING.length).toBeGreaterThan(0);
  });

  test("contains expected number of models", () => {
    expect(MODEL_PRICING).toHaveLength(7);
  });

  test("every entry has required fields", () => {
    for (const pricing of MODEL_PRICING) {
      expect(typeof pricing.model).toBe("string");
      expect(pricing.model.length).toBeGreaterThan(0);
      expect(typeof pricing.inputPerMtok).toBe("number");
      expect(typeof pricing.outputPerMtok).toBe("number");
      expect(typeof pricing.cacheWritePerMtok).toBe("number");
      expect(typeof pricing.cacheReadPerMtok).toBe("number");
    }
  });

  test("all prices are non-negative", () => {
    for (const pricing of MODEL_PRICING) {
      expect(pricing.inputPerMtok).toBeGreaterThanOrEqual(0);
      expect(pricing.outputPerMtok).toBeGreaterThanOrEqual(0);
      expect(pricing.cacheWritePerMtok).toBeGreaterThanOrEqual(0);
      expect(pricing.cacheReadPerMtok).toBeGreaterThanOrEqual(0);
    }
  });

  test("output pricing is always >= input pricing", () => {
    for (const pricing of MODEL_PRICING) {
      expect(pricing.outputPerMtok).toBeGreaterThanOrEqual(pricing.inputPerMtok);
    }
  });

  test("includes Anthropic Claude models", () => {
    const claudeModels = MODEL_PRICING.filter((p) => p.model.startsWith("claude-"));
    expect(claudeModels.length).toBe(3);
  });

  test("includes OpenAI models", () => {
    const openaiModels = MODEL_PRICING.filter(
      (p) => p.model.startsWith("gpt-") || p.model === "o3",
    );
    expect(openaiModels.length).toBe(2);
  });

  test("includes Google models", () => {
    const googleModels = MODEL_PRICING.filter((p) => p.model.startsWith("gemini-"));
    expect(googleModels.length).toBe(2);
  });

  test("has no duplicate model names", () => {
    const names = MODEL_PRICING.map((p) => p.model);
    expect(new Set(names).size).toBe(names.length);
  });

  test("claude-opus-4-5 has correct pricing", () => {
    const opus = MODEL_PRICING.find((p) => p.model === "claude-opus-4-5");
    expect(opus).toBeDefined();
    expect(opus?.inputPerMtok).toBe(15.0);
    expect(opus?.outputPerMtok).toBe(75.0);
    expect(opus?.cacheWritePerMtok).toBe(18.75);
    expect(opus?.cacheReadPerMtok).toBe(1.5);
  });
});

// ════════════════════════════════════════════════════════════════
// DEFAULT_CONFIG
// ════════════════════════════════════════════════════════════════

describe("DEFAULT_CONFIG", () => {
  test("has otel section", () => {
    expect(DEFAULT_CONFIG.otel).toBeDefined();
    expect(typeof DEFAULT_CONFIG.otel.enabled).toBe("boolean");
    expect(typeof DEFAULT_CONFIG.otel.port).toBe("number");
  });

  test("otel is enabled by default on port 4317", () => {
    expect(DEFAULT_CONFIG.otel.enabled).toBe(true);
    expect(DEFAULT_CONFIG.otel.port).toBe(4317);
  });

  test("has cloudSync section", () => {
    expect(DEFAULT_CONFIG.cloudSync).toBeDefined();
    expect(typeof DEFAULT_CONFIG.cloudSync.enabled).toBe("boolean");
    expect(typeof DEFAULT_CONFIG.cloudSync.endpoint).toBe("string");
  });

  test("cloudSync is disabled by default (local-first)", () => {
    expect(DEFAULT_CONFIG.cloudSync.enabled).toBe(false);
  });

  test("cloudSync endpoint points to production", () => {
    expect(DEFAULT_CONFIG.cloudSync.endpoint).toContain("gitintel.com");
  });

  test("has cost section", () => {
    expect(DEFAULT_CONFIG.cost).toBeDefined();
    expect(typeof DEFAULT_CONFIG.cost.currency).toBe("string");
    expect(typeof DEFAULT_CONFIG.cost.alertThresholdDaily).toBe("number");
  });

  test("cost currency is USD", () => {
    expect(DEFAULT_CONFIG.cost.currency).toBe("USD");
  });

  test("daily alert threshold is reasonable", () => {
    expect(DEFAULT_CONFIG.cost.alertThresholdDaily).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.cost.alertThresholdDaily).toBe(10.0);
  });
});

// ════════════════════════════════════════════════════════════════
// SCHEMA_VERSION
// ════════════════════════════════════════════════════════════════

describe("SCHEMA_VERSION", () => {
  test("is a string", () => {
    expect(typeof SCHEMA_VERSION).toBe("string");
  });

  test("matches gitintel/semver format", () => {
    expect(SCHEMA_VERSION).toMatch(/^gitintel\/\d+\.\d+\.\d+$/);
  });

  test("is version 1.0.0", () => {
    expect(SCHEMA_VERSION).toBe("gitintel/1.0.0");
  });
});

// ════════════════════════════════════════════════════════════════
// SUPPORTED_AGENTS
// ════════════════════════════════════════════════════════════════

describe("SUPPORTED_AGENTS", () => {
  test("is a non-empty array", () => {
    expect(SUPPORTED_AGENTS.length).toBeGreaterThan(0);
  });

  test("contains expected number of agents", () => {
    expect(SUPPORTED_AGENTS).toHaveLength(5);
  });

  test("includes Claude Code", () => {
    expect(SUPPORTED_AGENTS).toContain("Claude Code");
  });

  test("includes Cursor", () => {
    expect(SUPPORTED_AGENTS).toContain("Cursor");
  });

  test("includes GitHub Copilot", () => {
    expect(SUPPORTED_AGENTS).toContain("GitHub Copilot");
  });

  test("includes Codex", () => {
    expect(SUPPORTED_AGENTS).toContain("Codex");
  });

  test("includes Gemini Code Assist", () => {
    expect(SUPPORTED_AGENTS).toContain("Gemini Code Assist");
  });

  test("all entries are non-empty strings", () => {
    for (const agent of SUPPORTED_AGENTS) {
      expect(typeof agent).toBe("string");
      expect(agent.length).toBeGreaterThan(0);
    }
  });

  test("has no duplicates", () => {
    expect(new Set(SUPPORTED_AGENTS).size).toBe(SUPPORTED_AGENTS.length);
  });
});
