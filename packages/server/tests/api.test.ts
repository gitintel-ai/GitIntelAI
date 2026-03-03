/**
 * E2E API tests for GitIntel server
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import app from "../src/index";
import {
  seedDatabase,
  resetDatabase,
  testOrg,
  testUser,
  testRepo,
  authHeaders,
  createTestAttribution,
  createTestCostSession,
  createTestApiKey,
  apiKeyHeaders,
} from "./setup";

const baseUrl = "http://localhost:3001";

describe("Health Check", () => {
  test("GET /health returns healthy status", async () => {
    const res = await app.fetch(new Request(`${baseUrl}/health`));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.version).toBeDefined();
  });
});

describe("Sync API", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  test("POST /api/v1/sync/attribution creates attribution", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/sync/attribution`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          commitSha: "abc123def456",
          repoPath: "/test/repo",
          authorEmail: "test@example.com",
          authoredAt: new Date().toISOString(),
          aiLines: 100,
          humanLines: 50,
          totalLines: 150,
          aiPct: 66.67,
          totalCostUsd: 0.15,
          logJson: { agent: "Claude Code", model: "claude-opus-4-5" },
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();
  });

  test("POST /api/v1/sync/cost creates cost session", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/sync/cost`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: "sess_test_123",
          agent: "Claude Code",
          model: "claude-opus-4-5",
          projectPath: "/test/repo",
          startedAt: new Date().toISOString(),
          tokensIn: 2000,
          tokensOut: 1000,
          tokensCache: 500,
          costUsd: 0.25,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();
  });

  test("sync requires authentication", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/sync/attribution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributions: [] }),
      })
    );

    expect(res.status).toBe(401);
  });
});

describe("Stats API", () => {
  beforeEach(async () => {
    await seedDatabase();
    // Create test data
    await createTestAttribution({ aiLines: 100, humanLines: 50 });
    await createTestAttribution({ aiLines: 75, humanLines: 25 });
    await createTestCostSession({ tokensIn: 1000, costUsd: 0.05 });
    await createTestCostSession({ tokensIn: 2000, costUsd: 0.10 });
  });

  test("GET /api/v1/stats/team returns team stats", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/stats/team?period=30d`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalCommits).toBeDefined();
    expect(data.aiPercentage).toBeDefined();
  });

  test("GET /api/v1/stats/developer/:id returns developer stats", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/stats/developer/${testUser.id}`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.commits).toBeDefined();
  });

  test("stats with period filter", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/stats/team?period=7d`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
  });
});

describe("Cost API", () => {
  beforeEach(async () => {
    await seedDatabase();
    await createTestCostSession({ model: "claude-opus-4-5", costUsd: 0.15 });
    await createTestCostSession({ model: "claude-sonnet-4", costUsd: 0.03 });
  });

  test("GET /api/v1/cost/summary returns cost summary", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/cost/summary`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalCostUsd).toBeDefined();
  });

  test("cost breakdown by model", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/cost/summary?groupBy=model`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.byModel).toBeDefined();
  });
});

describe("Attribution API", () => {
  beforeEach(async () => {
    await seedDatabase();
    await createTestAttribution({ commitSha: "commit1" });
    await createTestAttribution({ commitSha: "commit2" });
  });

  test("GET /api/v1/attribution/:sha returns attribution", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/attribution/commit1`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.commitSha).toBe("commit1");
  });

  test("GET /api/v1/attribution returns list", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/attribution`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.attributions)).toBe(true);
    expect(data.attributions.length).toBeGreaterThanOrEqual(2);
  });

  test("attribution not found returns 404", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/attribution/nonexistent`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(404);
  });
});

describe("API Keys", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  test("POST /api/v1/api-keys creates API key", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/api-keys`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: "CI/CD Key",
          scopes: ["sync:write"],
          expiresInDays: 30,
        }),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.key).toBeDefined();
    expect(data.key).toContain("gitintel_");
    expect(data.warning).toBeDefined();
  });

  test("GET /api/v1/api-keys lists keys", async () => {
    // Create a key first
    await createTestApiKey();

    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/api-keys`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.keys)).toBe(true);
  });

  test("DELETE /api/v1/api-keys/:id revokes key", async () => {
    const { id } = await createTestApiKey();

    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/api-keys/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("API key authentication works", async () => {
    const { key } = await createTestApiKey(["sync:write", "stats:read"]);

    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/stats/team`, {
        headers: apiKeyHeaders(key),
      })
    );

    expect(res.status).toBe(200);
  });
});

describe("Audit Logs", () => {
  beforeEach(async () => {
    await seedDatabase();
    // Create API key to generate audit log
    await createTestApiKey();
  });

  test("GET /api/v1/audit returns audit logs", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/audit`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.logs)).toBe(true);
  });

  test("GET /api/v1/audit/summary/stats returns stats", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/audit/summary/stats?period=7d`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalEvents).toBeDefined();
  });

  test("audit logs can be filtered by action", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/audit?action=api_key.create`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
  });
});

describe("Alerts API", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  test("POST /api/v1/alerts/budget creates alert", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/alerts/budget`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          type: "daily",
          thresholdUsd: 10.0,
          channels: { slack: "https://hooks.slack.com/services/test" },
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.alert).toBeDefined();
  });

  test("GET /api/v1/alerts/budget lists alerts", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/alerts/budget`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.alerts)).toBe(true);
  });
});

describe("Webhooks API", () => {
  test("POST /api/v1/webhooks/github handles PR event", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/webhooks/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "pull_request",
          "X-Hub-Signature-256": "sha256=test",
        },
        body: JSON.stringify({
          action: "opened",
          pull_request: {
            number: 123,
            title: "Test PR",
            head: { sha: "abc123" },
            base: { sha: "def456" },
          },
          repository: {
            full_name: "test/repo",
          },
        }),
      })
    );

    // May be 200 or 202 depending on implementation
    expect([200, 202]).toContain(res.status);
  });
});

describe("Error Handling", () => {
  test("404 for unknown routes", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/unknown-route`, {
        headers: authHeaders(),
      })
    );

    expect(res.status).toBe(404);
  });

  test("400 for invalid JSON", async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/v1/sync/attribution`, {
        method: "POST",
        headers: authHeaders(),
        body: "invalid json{",
      })
    );

    expect([400, 500]).toContain(res.status);
  });
});

// Cleanup
afterAll(async () => {
  await resetDatabase();
});
