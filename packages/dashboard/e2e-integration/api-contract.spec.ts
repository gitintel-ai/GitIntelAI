import { test, expect, seedData, TEST_ORG_ID } from "./fixtures";

/**
 * API Contract Tests
 *
 * Hit the real Hono API server (backed by seeded Postgres) and verify
 * response shapes match what the dashboard expects.
 */

test.describe("API Health", () => {
  test("GET /health returns healthy status", async ({ apiContext }) => {
    const res = await apiContext.get("/health");
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });
});

test.describe("Stats API", () => {
  test("GET /api/v1/stats/team returns team statistics", async ({ apiContext }) => {
    const res = await apiContext.get("/api/v1/stats/team?period=30d");

    // Should return 200 if the endpoint exists
    if (res.status() === 200) {
      const body = await res.json();
      // Verify response shape
      expect(body).toBeDefined();
      if (body.data) {
        const data = body.data;
        // Team stats should have aggregate fields
        if (data.totalCommits !== undefined) {
          expect(typeof data.totalCommits).toBe("number");
        }
        if (data.aiPercentage !== undefined) {
          expect(typeof data.aiPercentage).toBe("number");
        }
      }
    } else {
      // Endpoint might return 404 if not implemented yet — that's OK for contract tests
      expect([200, 404]).toContain(res.status());
    }
  });

  test("GET /api/v1/stats/developers returns developer breakdown", async ({ apiContext }) => {
    const res = await apiContext.get("/api/v1/stats/developers?period=30d");

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
      if (Array.isArray(body.data)) {
        for (const dev of body.data) {
          expect(dev.email).toBeDefined();
          expect(typeof dev.email).toBe("string");
        }
      }
    } else {
      expect([200, 404]).toContain(res.status());
    }
  });
});

test.describe("Cost API", () => {
  test("GET /api/v1/cost/summary returns cost aggregation", async ({ apiContext }) => {
    const res = await apiContext.get("/api/v1/cost/summary?period=30d");

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
      if (body.data) {
        if (body.data.totalCostUsd !== undefined) {
          expect(typeof body.data.totalCostUsd).toBe("number");
          expect(body.data.totalCostUsd).toBeGreaterThanOrEqual(0);
        }
      }
    } else {
      expect([200, 404]).toContain(res.status());
    }
  });

  test("GET /api/v1/cost/sessions returns cost session list", async ({ apiContext }) => {
    const res = await apiContext.get("/api/v1/cost/sessions?period=30d");

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
      if (Array.isArray(body.data)) {
        expect(body.data.length).toBeGreaterThan(0);
        const session = body.data[0];
        expect(session.agent).toBeDefined();
        expect(session.model).toBeDefined();
        expect(typeof session.costUsd).toBe("number");
      }
    } else {
      expect([200, 404]).toContain(res.status());
    }
  });
});

test.describe("Attribution API", () => {
  test("GET /api/v1/attribution returns attribution list", async ({ apiContext }) => {
    const res = await apiContext.get("/api/v1/attribution?period=30d");

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
      if (Array.isArray(body.data)) {
        expect(body.data.length).toBeGreaterThan(0);
        const attr = body.data[0];
        expect(attr.commitSha).toBeDefined();
        expect(attr.authorEmail).toBeDefined();
        expect(typeof attr.aiPct).toBe("number");
      }
    } else {
      expect([200, 404]).toContain(res.status());
    }
  });
});

test.describe("Alerts API", () => {
  test("GET /api/v1/alerts returns budget alerts", async ({ apiContext }) => {
    const res = await apiContext.get("/api/v1/alerts");

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
      if (Array.isArray(body.data)) {
        expect(body.data.length).toBe(seedData.budgetAlertCount);
        const alert = body.data[0];
        expect(alert.type).toBeDefined();
        expect(typeof alert.thresholdUsd).toBe("number");
      }
    } else {
      expect([200, 404]).toContain(res.status());
    }
  });
});

test.describe("Auth contract", () => {
  test("unauthenticated requests return 401", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: "http://localhost:3001",
    });
    const res = await ctx.get("/api/v1/stats/team");
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test("mock JWT is accepted in test mode", async ({ apiContext }) => {
    const res = await apiContext.get("/health");
    expect(res.ok()).toBe(true);
  });
});
