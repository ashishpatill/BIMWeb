import { test, expect } from "@playwright/test";
import { hasDashboardE2E } from "./helpers";

/**
 * Platform Health: view 4 service cards, run test query, see trace timeline.
 * Requires live ecosystem services; auth via Kinde session or E2E_TEST_BYPASS.
 */

test.describe("Platform Health", () => {
  test.skip(
    !hasDashboardE2E(),
    "Skipped: set E2E_TEST_BYPASS=true or E2E_BASE_URL for dashboard E2E.",
  );

  test("health page shows four service cards", async ({ page }) => {
    await page.goto("/dashboard/health");
    // Check for service names
    await expect(page.getByText(/BIMAgent/i)).toBeVisible();
    await expect(page.getByText(/BIMIndex/i)).toBeVisible();
    await expect(page.getByText(/BIMExtract/i)).toBeVisible();
    await expect(page.getByText(/BIMCloud/i)).toBeVisible();
  });

  test("test query card is interactive", async ({ page }) => {
    await page.goto("/dashboard/health");
    // Test query input
    const queryInput = page.getByRole("textbox", { name: /query|test/i });
    await expect(queryInput).toBeVisible();
    // Submit button
    await expect(page.getByRole("button", { name: /run|submit|test/i })).toBeVisible();
  });
});
