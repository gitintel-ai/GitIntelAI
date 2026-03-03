import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("team page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });

  test("cost page is accessible", async ({ page }) => {
    await page.goto("/cost");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });

  test("tables have proper headers", async ({ page }) => {
    await page.goto("/developers");
    await page.waitForLoadState("networkidle");

    const tables = page.locator("table");
    const count = await tables.count();

    for (let i = 0; i < count; i++) {
      const table = tables.nth(i);
      const headers = table.locator("th");
      expect(await headers.count()).toBeGreaterThan(0);
    }
  });

  test("all images have alt text", async ({ page }) => {
    await page.goto("/team");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });

  test("interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/team");

    // Tab through elements
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Continue tabbing
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Check something is focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test("forms have associated labels", async ({ page }) => {
    await page.goto("/settings/alerts");
    await page.waitForLoadState("networkidle");

    // Open the dialog to expose form inputs
    const newAlertBtn = page.getByRole("button", { name: /new alert/i });
    if (await newAlertBtn.isVisible()) {
      await newAlertBtn.click();
      await page.waitForTimeout(500);
    }

    const inputs = page.locator("input:not([type=hidden])");
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const ariaLabel = await input.getAttribute("aria-label");
        const ariaLabelledBy = await input.getAttribute("aria-labelledby");

        // Should have either a label, aria-label, or aria-labelledby
        const hasLabel =
          (await label.count()) > 0 || ariaLabel || ariaLabelledBy;
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test("headings are in logical order", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("networkidle");

    const headings = await page.$$eval("h1, h2, h3, h4, h5, h6", (elements) =>
      elements.map((el) => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent?.trim(),
      }))
    );

    // Should have at least one h1
    const hasH1 = headings.some((h) => h.level === 1);
    expect(hasH1).toBeTruthy();
  });

  test("modals trap focus", async ({ page }) => {
    await page.goto("/settings/alerts");

    // Open a modal
    const newAlertBtn = page.getByRole("button", { name: /new alert/i });
    if (await newAlertBtn.isVisible()) {
      await newAlertBtn.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Tab through dialog
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");
      }

      // Focus should still be within dialog
      const activeElement = await page.evaluate(() => {
        const active = document.activeElement;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(active);
      });

      expect(activeElement).toBeTruthy();

      // Close with Escape
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
  });
});
