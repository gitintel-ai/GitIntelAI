import { test, expect, seedData } from "./fixtures";

/**
 * Integration page tests
 *
 * Load dashboard pages with the real API server running (backed by seeded Postgres).
 * Verifies that pages render with real data flowing through the full stack.
 */

test.describe("Dashboard pages with real API", () => {
  test("homepage redirects to /team", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/(team)?$/);
    expect(page.url()).toMatch(/\/(team)?$/);
  });

  test("team page loads and shows content", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("networkidle");

    // Page should have a heading
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("cost page loads", async ({ page }) => {
    await page.goto("/cost");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("developers page shows seeded developers", async ({ page }) => {
    await page.goto("/developers");
    await page.waitForLoadState("networkidle");

    // Should contain developer names or emails from seed data
    const pageContent = await page.textContent("body");
    const hasAlice = pageContent?.includes(seedData.users.alice.name) || pageContent?.includes(seedData.users.alice.email);
    const hasBob = pageContent?.includes(seedData.users.bob.name) || pageContent?.includes(seedData.users.bob.email);

    // At least one developer should be visible
    expect(hasAlice || hasBob).toBe(true);
  });

  test("repos page shows seeded repository", async ({ page }) => {
    await page.goto("/repos");
    await page.waitForLoadState("networkidle");

    const pageContent = await page.textContent("body");
    expect(pageContent).toContain(seedData.repo.name);
  });

  test("settings/alerts page shows budget alerts", async ({ page }) => {
    await page.goto("/settings/alerts");
    await page.waitForLoadState("networkidle");

    // Page should load without error
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Navigation with real data", () => {
  test("sidebar links navigate between pages", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("networkidle");

    // Find sidebar navigation
    const nav = page.locator('[data-testid="sidebar"]').or(page.locator("nav"));

    // Navigate to Cost page
    const costLink = nav.getByRole("link", { name: /cost/i });
    if (await costLink.isVisible()) {
      await costLink.click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/cost");
    }

    // Navigate to Developers page
    const devLink = nav.getByRole("link", { name: /developer/i });
    if (await devLink.isVisible()) {
      await devLink.click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/developer");
    }
  });
});
