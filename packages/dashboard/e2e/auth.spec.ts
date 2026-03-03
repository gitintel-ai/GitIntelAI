import { test, expect } from "@playwright/test";

test.describe("Authentication (No-Auth Mode)", () => {
  test("homepage redirects to /team", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/team/);
  });

  test("dashboard pages are accessible without auth", async ({ page }) => {
    const routes = ["/team", "/cost", "/developers", "/repos", "/pulls", "/context", "/settings/alerts"];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("sidebar navigation links are present", async ({ page }) => {
    await page.goto("/team");

    await expect(page.getByRole("link", { name: /team/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /cost/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /developers/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /repos/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /pull requests/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /context/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
  });

  test("header is visible on dashboard pages", async ({ page }) => {
    await page.goto("/team");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });
});
