import { test, expect } from "@playwright/test";

/**
 * Platform Health: view 4 service cards, run test query, see trace timeline.
 * Requires live Kinde + all 4 ecosystem services (BIMAgent, BIMIndex,
 * BIMExtract, BIMCloud).
 */

test.describe("Platform Health", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + all 4 ecosystem services. Run via CI with E2E_BASE_URL set.",
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
