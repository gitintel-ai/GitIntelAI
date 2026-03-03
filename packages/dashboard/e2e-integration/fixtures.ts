import { test as base, expect, type APIRequestContext } from "@playwright/test";

// Fixed IDs matching seed.ts
export const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_REPO_ID = "00000000-0000-0000-0000-000000000010";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Custom fixtures for integration E2E tests.
 * Provides an authenticated API request context and Clerk auth mocking.
 */
export const test = base.extend<{
  apiContext: APIRequestContext;
}>({
  // Pre-authenticated API context for direct API calls
  apiContext: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: API_BASE,
      extraHTTPHeaders: {
        Authorization: "Bearer mock_jwt_integration",
        "X-Organization-Id": TEST_ORG_ID,
        "Content-Type": "application/json",
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  // Override default page to mock Clerk auth
  page: async ({ page }, use) => {
    // Mock Clerk authentication
    await page.addInitScript(() => {
      (window as any).__clerk_frontend_api = "test";
      (window as any).__clerk_js_version = "test";
    });

    await page.context().addCookies([
      {
        name: "__session",
        value: "mock_session_token",
        domain: "localhost",
        path: "/",
      },
      {
        name: "__clerk_db_jwt",
        value: "mock_jwt_integration",
        domain: "localhost",
        path: "/",
      },
    ]);

    await use(page);
  },
});

export { expect };

/**
 * Seed data constants (must match seed.ts)
 */
export const seedData = {
  org: { id: TEST_ORG_ID, name: "Acme Corp" },
  repo: { id: TEST_REPO_ID, name: "frontend-app" },
  users: {
    alice: { email: "alice@acme.com", name: "Alice Chen" },
    bob: { email: "bob@acme.com", name: "Bob Smith" },
  },
  attributionCount: 10,
  costSessionCount: 10,
  budgetAlertCount: 2,
};
