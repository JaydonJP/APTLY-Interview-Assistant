import { test, expect } from "@playwright/test";

test.describe("Landing & Navigation", () => {
  test("loads landing page with hero text", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/APTLY/);
    await expect(page.locator("h1")).toContainText("Interview better");
  });

  test("can navigate to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.click("#cta-get-started");
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("dashboard displays system health card", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("#system-health-card")).toBeVisible();
  });
});
