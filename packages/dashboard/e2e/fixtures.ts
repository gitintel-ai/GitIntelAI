import { test as base, expect } from "@playwright/test";

/**
 * Custom test fixtures for GitIntel dashboard
 */

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: typeof base;
}>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Mock Clerk authentication
    await page.addInitScript(() => {
      // Mock window.Clerk for testing
      (window as any).__clerk_frontend_api = "test";
      (window as any).__clerk_js_version = "test";
    });

    // Set auth cookies (mock session)
    await page.context().addCookies([
      {
        name: "__session",
        value: "mock_session_token",
        domain: "localhost",
        path: "/",
      },
      {
        name: "__clerk_db_jwt",
        value: "mock_jwt_token",
        domain: "localhost",
        path: "/",
      },
    ]);

    await use(base);
  },
});

export { expect };

/**
 * Test data generators
 */
export const testData = {
  developer: {
    email: "alice@acme.com",
    name: "Alice Developer",
    commits: 45,
    aiPct: 52.3,
    cost: 34.56,
  },

  repository: {
    name: "frontend-app",
    fullName: "acme/frontend-app",
    language: "TypeScript",
    aiPct: 45.2,
    commits: 234,
  },

  pullRequest: {
    number: 123,
    title: "Add user authentication",
    state: "open",
    aiPct: 58.2,
    cost: 12.45,
  },
};

/**
 * Page object helpers
 */
export class DashboardPage {
  constructor(private page: any) {}

  async goto(path: string = "/") {
    await this.page.goto(path);
  }

  async waitForData() {
    await this.page.waitForLoadState("networkidle");
  }

  sidebar() {
    return this.page.locator('[data-testid="sidebar"]').or(this.page.locator("nav"));
  }

  async navigateTo(name: string) {
    await this.sidebar().getByRole("link", { name }).click();
  }

  kpiCards() {
    return this.page.locator('[data-testid="kpi-card"]').or(this.page.locator(".rounded-lg.border.bg-card"));
  }

  table() {
    return this.page.locator("table");
  }

  chart() {
    return this.page.locator('[data-testid="chart"]').or(this.page.locator(".recharts-wrapper"));
  }
}
