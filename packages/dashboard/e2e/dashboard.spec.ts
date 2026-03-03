import { test, expect, DashboardPage } from "./fixtures";

test.describe("Dashboard Overview", () => {
  test("homepage redirects to team page with KPI cards", async ({ page }) => {
    await page.goto("/");

    // Should redirect to /team
    await expect(page).toHaveURL(/\/team/);

    // Team page should show key metrics
    await expect(page.locator("text=AI Adoption")).toBeVisible();
    await expect(page.locator("text=Total Spend")).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/team");

    // Navigate to Cost page
    await page.getByRole("link", { name: /cost/i }).click();
    await expect(page).toHaveURL(/\/cost/);

    // Navigate to Developers page
    await page.getByRole("link", { name: /developers/i }).click();
    await expect(page).toHaveURL(/\/developers/);

    // Navigate to Repos page
    await page.getByRole("link", { name: /repos/i }).click();
    await expect(page).toHaveURL(/\/repos/);
  });

  test("responsive layout works on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/team");

    // Page should still load
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("Team Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/team");
  });

  test("displays team AI adoption heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /team ai adoption/i })).toBeVisible();
  });

  test("displays KPI cards", async ({ page }) => {
    await expect(page.locator("text=AI Adoption")).toBeVisible();
    await expect(page.locator("text=Total Commits")).toBeVisible();
    await expect(page.locator("text=AI Lines")).toBeVisible();
    await expect(page.locator("text=Total Spend")).toBeVisible();
  });

  test("shows adoption heatmap", async ({ page }) => {
    await expect(page.locator("text=Adoption Heatmap")).toBeVisible();
  });
});

test.describe("Cost Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cost");
  });

  test("displays cost overview", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /cost intelligence/i })).toBeVisible();
    await expect(page.locator("text=$")).toBeVisible();
  });

  test("shows cost trend chart", async ({ page }) => {
    await page.waitForSelector(".recharts-wrapper", { timeout: 10000 });
  });

  test("displays model breakdown in chart", async ({ page }) => {
    // The chart legend has model names
    await page.waitForSelector(".recharts-wrapper", { timeout: 10000 });
    await expect(page.locator("text=Claude Opus").or(page.locator("text=Claude Sonnet"))).toBeVisible();
  });
});

test.describe("Developers Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/developers");
  });

  test("lists developers with stats", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("th:text('Developer')")).toBeVisible();
  });

  test("shows developer data", async ({ page }) => {
    await expect(page.locator("text=Alice Chen")).toBeVisible();
    await expect(page.locator("text=Bob Smith")).toBeVisible();
  });
});

test.describe("Repositories Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/repos");
  });

  test("lists repositories", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /repositories/i })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("search filters repositories", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("frontend");
    await page.waitForTimeout(500);
    // Should still show filtered results
    await expect(page.locator("text=frontend-app")).toBeVisible();
  });

  test("repository links navigate to detail", async ({ page }) => {
    const repoLink = page.locator("table a").first();
    await repoLink.click();
    await expect(page).toHaveURL(/\/repos\//);
  });
});

test.describe("Pull Requests Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pulls");
  });

  test("lists pull requests", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /pull requests/i })).toBeVisible();
  });

  test("displays PR cost badges", async ({ page }) => {
    await expect(page.locator("text=$")).toBeVisible();
  });

  test("shows PR state badges", async ({ page }) => {
    await expect(page.locator("text=Merged").or(page.locator("text=Open"))).toBeVisible();
  });
});

test.describe("Context Optimization Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/context");
  });

  test("displays token statistics", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /context optimization/i })).toBeVisible();
    await expect(page.locator("text=Current Tokens")).toBeVisible();
  });

  test("shows suggestions tab", async ({ page }) => {
    const suggestionsTab = page.getByRole("tab", { name: /suggestions/i });
    await expect(suggestionsTab).toBeVisible();
  });

  test("sections tab shows CLAUDE.md sections", async ({ page }) => {
    const sectionsTab = page.getByRole("tab", { name: /sections/i });
    await sectionsTab.click();
    await expect(page.locator("text=CLAUDE.md Sections")).toBeVisible();
  });

  test("memory tab shows memory items", async ({ page }) => {
    const memoryTab = page.getByRole("tab", { name: /memory/i });
    await memoryTab.click();
    await expect(page.locator("table")).toBeVisible();
  });
});

test.describe("Budget Alerts Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/alerts");
  });

  test("displays alert configuration", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /budget alerts/i })).toBeVisible();
  });

  test("create new alert button opens dialog", async ({ page }) => {
    const newAlertBtn = page.getByRole("button", { name: /new alert/i });
    await expect(newAlertBtn).toBeVisible();
    await newAlertBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("alert list shows existing alerts", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible();
  });

  test("notification channels section exists", async ({ page }) => {
    await expect(page.locator("text=Notification Channels")).toBeVisible();
  });
});
