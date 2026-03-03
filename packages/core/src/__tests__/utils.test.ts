import { describe, expect, test } from "bun:test";
import {
  getModelPricing,
  calculateCost,
  parsePeriod,
  getDateFromPeriod,
  parseLineRanges,
  countLinesInRanges,
  formatCurrency,
  formatPercentage,
  formatNumber,
  isValidSha,
  isValidEmail,
} from "../utils";

// ════════════════════════════════════════════════════════════════
// getModelPricing
// ════════════════════════════════════════════════════════════════

describe("getModelPricing", () => {
  test("returns pricing for exact model name", () => {
    const pricing = getModelPricing("claude-opus-4-5");
    expect(pricing).toBeDefined();
    expect(pricing!.model).toBe("claude-opus-4-5");
    expect(pricing!.inputPerMtok).toBe(15.0);
    expect(pricing!.outputPerMtok).toBe(75.0);
  });

  test("matches case-insensitively", () => {
    const pricing = getModelPricing("Claude-Opus-4-5");
    expect(pricing).toBeDefined();
    expect(pricing!.model).toBe("claude-opus-4-5");
  });

  test("matches substring (model name embedded in longer string)", () => {
    const pricing = getModelPricing("anthropic/claude-sonnet-4-5-latest");
    expect(pricing).toBeDefined();
    expect(pricing!.model).toBe("claude-sonnet-4-5");
  });

  test("returns pricing for OpenAI models", () => {
    const pricing = getModelPricing("gpt-4o");
    expect(pricing).toBeDefined();
    expect(pricing!.inputPerMtok).toBe(2.5);
  });

  test("returns pricing for Google models", () => {
    const pricing = getModelPricing("gemini-2.5-pro");
    expect(pricing).toBeDefined();
    expect(pricing!.inputPerMtok).toBe(1.25);
  });

  test("returns undefined for unknown model", () => {
    expect(getModelPricing("unknown-model-xyz")).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    expect(getModelPricing("")).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════
// calculateCost
// ════════════════════════════════════════════════════════════════

describe("calculateCost", () => {
  test("calculates cost for known model", () => {
    // claude-opus-4-5: input=$15/M, output=$75/M, cache_read=$1.5/M
    const cost = calculateCost("claude-opus-4-5", 1_000_000, 1_000_000, 0);
    expect(cost).toBe(15.0 + 75.0); // $90
  });

  test("calculates cost with cache tokens", () => {
    const cost = calculateCost("claude-opus-4-5", 1_000_000, 0, 1_000_000);
    expect(cost).toBe(15.0 + 0 + 1.5); // input + cache_read
  });

  test("returns 0 for unknown model", () => {
    expect(calculateCost("unknown", 1000, 1000)).toBe(0);
  });

  test("handles zero tokens", () => {
    expect(calculateCost("claude-opus-4-5", 0, 0, 0)).toBe(0);
  });

  test("defaults cacheTokens to 0", () => {
    const cost = calculateCost("claude-opus-4-5", 1_000_000, 0);
    expect(cost).toBe(15.0);
  });

  test("scales linearly with token count", () => {
    const cost1 = calculateCost("gpt-4o", 500_000, 500_000);
    const cost2 = calculateCost("gpt-4o", 1_000_000, 1_000_000);
    expect(cost2).toBeCloseTo(cost1 * 2, 10);
  });
});

// ════════════════════════════════════════════════════════════════
// parsePeriod
// ════════════════════════════════════════════════════════════════

describe("parsePeriod", () => {
  test("parses days", () => {
    expect(parsePeriod("7d")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test("parses weeks", () => {
    expect(parsePeriod("2w")).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });

  test("parses months (30 days)", () => {
    expect(parsePeriod("3m")).toBe(3 * 30 * 24 * 60 * 60 * 1000);
  });

  test("parses years (365 days)", () => {
    expect(parsePeriod("1y")).toBe(365 * 24 * 60 * 60 * 1000);
  });

  test("throws on invalid format", () => {
    expect(() => parsePeriod("abc")).toThrow("Invalid period format");
  });

  test("throws on empty string", () => {
    expect(() => parsePeriod("")).toThrow("Invalid period format");
  });

  test("throws on unsupported unit", () => {
    expect(() => parsePeriod("5x")).toThrow("Invalid period format");
  });

  test("throws on negative number", () => {
    expect(() => parsePeriod("-3d")).toThrow("Invalid period format");
  });

  test("throws on decimal number", () => {
    expect(() => parsePeriod("1.5d")).toThrow("Invalid period format");
  });
});

// ════════════════════════════════════════════════════════════════
// getDateFromPeriod
// ════════════════════════════════════════════════════════════════

describe("getDateFromPeriod", () => {
  test("returns a Date in the past", () => {
    const date = getDateFromPeriod("7d");
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBeLessThan(Date.now());
  });

  test("7d returns roughly 7 days ago", () => {
    const now = Date.now();
    const date = getDateFromPeriod("7d");
    const diffMs = now - date.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    // Allow 100ms tolerance for execution time
    expect(Math.abs(diffMs - sevenDaysMs)).toBeLessThan(100);
  });

  test("propagates error for invalid period", () => {
    expect(() => getDateFromPeriod("invalid")).toThrow();
  });
});

// ════════════════════════════════════════════════════════════════
// parseLineRanges
// ════════════════════════════════════════════════════════════════

describe("parseLineRanges", () => {
  test("parses a single range", () => {
    expect(parseLineRanges("12-45")).toEqual([[12, 45]]);
  });

  test("parses multiple ranges", () => {
    expect(parseLineRanges("12-45,78-103")).toEqual([
      [12, 45],
      [78, 103],
    ]);
  });

  test("parses single line as [n, n]", () => {
    expect(parseLineRanges("42")).toEqual([[42, 42]]);
  });

  test("handles whitespace around commas", () => {
    expect(parseLineRanges("1-10, 20-30")).toEqual([
      [1, 10],
      [20, 30],
    ]);
  });

  test("handles whitespace around dashes", () => {
    expect(parseLineRanges("1 - 10")).toEqual([[1, 10]]);
  });

  test("handles mixed single lines and ranges", () => {
    expect(parseLineRanges("5,10-20,30")).toEqual([
      [5, 5],
      [10, 20],
      [30, 30],
    ]);
  });
});

// ════════════════════════════════════════════════════════════════
// countLinesInRanges
// ════════════════════════════════════════════════════════════════

describe("countLinesInRanges", () => {
  test("counts lines in single range (inclusive)", () => {
    expect(countLinesInRanges([[1, 10]])).toBe(10);
  });

  test("counts lines in multiple ranges", () => {
    expect(
      countLinesInRanges([
        [1, 10],
        [20, 30],
      ]),
    ).toBe(10 + 11);
  });

  test("single line range [n, n] counts as 1", () => {
    expect(countLinesInRanges([[5, 5]])).toBe(1);
  });

  test("empty array returns 0", () => {
    expect(countLinesInRanges([])).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// formatCurrency
// ════════════════════════════════════════════════════════════════

describe("formatCurrency", () => {
  test("formats values >= $1 with 2 decimal places", () => {
    expect(formatCurrency(12.5)).toBe("$12.50");
  });

  test("formats values < $1 with 4 decimal places", () => {
    expect(formatCurrency(0.0234)).toBe("$0.0234");
  });

  test("formats exactly $1 with 2 decimal places", () => {
    expect(formatCurrency(1)).toBe("$1.00");
  });

  test("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.0000");
  });

  test("formats large values", () => {
    expect(formatCurrency(1234.56)).toBe("$1234.56");
  });
});

// ════════════════════════════════════════════════════════════════
// formatPercentage
// ════════════════════════════════════════════════════════════════

describe("formatPercentage", () => {
  test("formats with default 1 decimal place", () => {
    expect(formatPercentage(52.345)).toBe("52.3%");
  });

  test("formats with custom decimal places", () => {
    expect(formatPercentage(52.346, 2)).toBe("52.35%");
  });

  test("formats zero", () => {
    expect(formatPercentage(0)).toBe("0.0%");
  });

  test("formats 100%", () => {
    expect(formatPercentage(100)).toBe("100.0%");
  });

  test("formats with 0 decimal places", () => {
    expect(formatPercentage(52.7, 0)).toBe("53%");
  });
});

// ════════════════════════════════════════════════════════════════
// formatNumber
// ════════════════════════════════════════════════════════════════

describe("formatNumber", () => {
  test("formats small numbers as-is", () => {
    expect(formatNumber(42)).toBe("42");
  });

  test("formats large numbers with separators", () => {
    const result = formatNumber(1234567);
    // Locale-dependent, but should contain the digits
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("567");
  });

  test("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

// ════════════════════════════════════════════════════════════════
// isValidSha
// ════════════════════════════════════════════════════════════════

describe("isValidSha", () => {
  test("accepts valid 40-char lowercase hex SHA", () => {
    expect(isValidSha("a".repeat(40))).toBe(true);
  });

  test("accepts valid mixed-case hex SHA", () => {
    expect(isValidSha("aAbBcCdDeEfF00112233" + "44556677889900aabbcc")).toBe(true);
  });

  test("accepts realistic SHA", () => {
    expect(isValidSha("ac0c325f1a2b3c4d5e6f7890abcdef1234567890")).toBe(true);
  });

  test("rejects 39-char string", () => {
    expect(isValidSha("a".repeat(39))).toBe(false);
  });

  test("rejects 41-char string", () => {
    expect(isValidSha("a".repeat(41))).toBe(false);
  });

  test("rejects non-hex characters", () => {
    expect(isValidSha("g".repeat(40))).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidSha("")).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// isValidEmail
// ════════════════════════════════════════════════════════════════

describe("isValidEmail", () => {
  test("accepts standard email", () => {
    expect(isValidEmail("alice@example.com")).toBe(true);
  });

  test("accepts email with subdomain", () => {
    expect(isValidEmail("alice@mail.example.com")).toBe(true);
  });

  test("accepts email with plus addressing", () => {
    expect(isValidEmail("alice+tag@example.com")).toBe(true);
  });

  test("accepts email with dots in local part", () => {
    expect(isValidEmail("first.last@example.com")).toBe(true);
  });

  test("rejects missing @", () => {
    expect(isValidEmail("alice-example.com")).toBe(false);
  });

  test("rejects missing domain", () => {
    expect(isValidEmail("alice@")).toBe(false);
  });

  test("rejects missing local part", () => {
    expect(isValidEmail("@example.com")).toBe(false);
  });

  test("rejects spaces", () => {
    expect(isValidEmail("al ice@example.com")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});
