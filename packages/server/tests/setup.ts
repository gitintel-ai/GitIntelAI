/**
 * Test setup and utilities for API server tests
 */
import { db } from "../src/db";
import { organizations, users, repositories, attributions, costSessions, apiKeys, auditLogs, budgetAlerts } from "../src/db/schema";
import { createHash, randomBytes, randomUUID } from "crypto";

// Test organization (valid UUIDs required by schema)
export const testOrg = {
  id: "00000000-0000-4000-a000-000000000001",
  name: "Test Organization",
};

// Test user
export const testUser = {
  id: "00000000-0000-4000-a000-000000000002",
  email: "test@example.com",
  name: "Test User",
  clerkId: "clerk_test_123",
  role: "admin",
};

// Test repository
export const testRepo = {
  id: "00000000-0000-4000-a000-000000000003",
  name: "test-repo",
  remoteUrl: "https://github.com/test/repo.git",
};

/**
 * Reset database to clean state
 */
export async function resetDatabase() {
  // Clear tables in reverse dependency order
  await db.delete(auditLogs);
  await db.delete(apiKeys);
  await db.delete(budgetAlerts);
  await db.delete(costSessions);
  await db.delete(attributions);
  await db.delete(repositories);
  await db.delete(users);
  await db.delete(organizations);
}

/**
 * Seed database with test data
 */
export async function seedDatabase() {
  await resetDatabase();

  // Create organization
  await db.insert(organizations).values({
    id: testOrg.id,
    name: testOrg.name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create user
  await db.insert(users).values({
    id: testUser.id,
    email: testUser.email,
    name: testUser.name,
    clerkId: testUser.clerkId,
    organizationId: testOrg.id,
    role: testUser.role,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create repository
  await db.insert(repositories).values({
    id: testRepo.id,
    orgId: testOrg.id,
    name: testRepo.name,
    remoteUrl: testRepo.remoteUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Create a test API key
 */
export async function createTestApiKey(scopes: string[] = ["sync:write", "stats:read"]) {
  const bytes = randomBytes(32);
  const key = "gitintel_" + bytes.toString("base64url");
  const hash = createHash("sha256").update(key).digest("hex");
  const id = randomUUID();

  await db.insert(apiKeys).values({
    id,
    organizationId: testOrg.id,
    name: "Test API Key",
    keyHash: hash,
    keyPrefix: key.substring(0, 12),
    scopes,
    createdBy: testUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { id, key };
}

/**
 * Generate mock JWT for testing (mimics Clerk JWT)
 */
export function generateMockJwt(userId: string = testUser.clerkId) {
  // In real tests, you'd use Clerk's test mode or mock the verification
  return `mock_jwt_${userId}_${Date.now()}`;
}

/**
 * Create test attribution data
 */
export async function createTestAttribution(data: Partial<typeof attributions.$inferInsert> = {}) {
  const id = randomUUID();
  await db.insert(attributions).values({
    id,
    repoId: testRepo.id,
    commitSha: data.commitSha || `abc${Date.now()}`,
    authorEmail: data.authorEmail || testUser.email,
    authoredAt: data.authoredAt || new Date(),
    aiLines: data.aiLines || 50,
    humanLines: data.humanLines || 50,
    totalLines: data.totalLines || 100,
    aiPct: data.aiPct || 50,
    totalCostUsd: data.totalCostUsd || 0.05,
    logJson: data.logJson || {},
    createdAt: new Date(),
  });
  return id;
}

/**
 * Create test cost session data
 */
export async function createTestCostSession(data: Partial<typeof costSessions.$inferInsert> = {}) {
  const id = randomUUID();
  await db.insert(costSessions).values({
    id,
    sessionId: data.sessionId || `sess_${Date.now()}`,
    repoId: testRepo.id,
    commitSha: data.commitSha,
    agent: data.agent || "Claude Code",
    model: data.model || "claude-opus-4-5",
    startedAt: data.startedAt || new Date(),
    endedAt: data.endedAt,
    tokensIn: data.tokensIn || 1000,
    tokensOut: data.tokensOut || 500,
    tokensCache: data.tokensCache || 0,
    costUsd: data.costUsd || 0.05,
    createdAt: new Date(),
  });
  return id;
}

/**
 * Request helper with auth
 */
export function authHeaders(token?: string) {
  return {
    Authorization: `Bearer ${token || generateMockJwt()}`,
    "Content-Type": "application/json",
    "X-Organization-Id": testOrg.id,
  };
}

/**
 * API key auth headers
 */
export function apiKeyHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}
