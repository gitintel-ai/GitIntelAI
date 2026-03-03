import { defineConfig, devices } from "@playwright/test";

/**
 * Integration E2E config: starts the real API server + Next.js dashboard,
 * Playwright tests hit real endpoints backed by a seeded Postgres DB.
 */
export default defineConfig({
  testDir: "./e2e-integration",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report-integration" }],
    ["json", { outputFile: "test-results-integration/results.json" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    extraHTTPHeaders: {
      Authorization: "Bearer mock_jwt_integration",
      "X-Organization-Id": "00000000-0000-0000-0000-000000000001",
    },
  },

  projects: [
    {
      name: "integration-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      // API server (Hono on Bun)
      command: "cd ../server && NODE_ENV=test bun run src/index.ts",
      url: "http://localhost:3001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
      env: {
        NODE_ENV: "test",
        PORT: "3001",
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:test@localhost:5432/gitintel_test",
      },
    },
    {
      // Next.js dashboard
      command: process.env.CI ? "bunx next start" : "bunx next dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
      },
    },
  ],
});
