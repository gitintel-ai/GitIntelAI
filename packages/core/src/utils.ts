// GitIntel Core Utilities

import { MODEL_PRICING } from "./constants";
import type { ModelPricing } from "./types";

// ════════════════════════════════════════════════════════════════
// Cost Calculation
// ════════════════════════════════════════════════════════════════

/**
 * Get pricing for a model
 */
export function getModelPricing(model: string): ModelPricing | undefined {
  return MODEL_PRICING.find((p) => model.toLowerCase().includes(p.model.toLowerCase()));
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheTokens = 0,
): number {
  const pricing = getModelPricing(model);
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMtok;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMtok;
  const cacheCost = (cacheTokens / 1_000_000) * pricing.cacheReadPerMtok;

  return inputCost + outputCost + cacheCost;
}

// ════════════════════════════════════════════════════════════════
// Time Period Parsing
// ════════════════════════════════════════════════════════════════

/**
 * Parse a time period string (e.g., "7d", "30d", "3m") to milliseconds
 */
export function parsePeriod(period: string): number {
  const match = period.match(/^(\d+)([dwmy])$/);
  if (!match) throw new Error(`Invalid period format: ${period}`);

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case "d":
      return num * 24 * 60 * 60 * 1000;
    case "w":
      return num * 7 * 24 * 60 * 60 * 1000;
    case "m":
      return num * 30 * 24 * 60 * 60 * 1000;
    case "y":
      return num * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown period unit: ${unit}`);
  }
}

/**
 * Get date from period string (from now)
 */
export function getDateFromPeriod(period: string): Date {
  const ms = parsePeriod(period);
  return new Date(Date.now() - ms);
}

// ════════════════════════════════════════════════════════════════
// Line Range Utilities
// ════════════════════════════════════════════════════════════════

/**
 * Parse line ranges from a string (e.g., "12-45,78-103")
 */
export function parseLineRanges(lines: string): [number, number][] {
  return lines.split(",").map((part) => {
    const trimmed = part.trim();
    const [start, end] = trimmed.split("-").map((n) => parseInt(n.trim(), 10));
    return end ? [start, end] : [start, start];
  });
}

/**
 * Calculate total lines from ranges
 */
export function countLinesInRanges(ranges: [number, number][]): number {
  return ranges.reduce((total, [start, end]) => total + (end - start + 1), 0);
}

// ════════════════════════════════════════════════════════════════
// Formatting
// ════════════════════════════════════════════════════════════════

/**
 * Format USD currency
 */
export function formatCurrency(value: number): string {
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

// ════════════════════════════════════════════════════════════════
// Validation
// ════════════════════════════════════════════════════════════════

/**
 * Validate SHA format
 */
export function isValidSha(sha: string): boolean {
  return /^[a-f0-9]{40}$/i.test(sha);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
