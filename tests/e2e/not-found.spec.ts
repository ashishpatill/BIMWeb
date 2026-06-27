import { test, expect } from "@playwright/test";

/**
 * The dashboard not-found page lives at /dashboard/not-found and is triggered
 * by visiting any unmatched /dashboard/* route (e.g. /dashboard/nope).
 * It requires passing through the /dashboard layout, which enforces auth.
 */

test.describe("Dashboard not-found page", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires authenticated Kinde session to bypass dashboard auth guard. Set E2E_BASE_URL.",
  );

  test("bogus /dashboard/nope shows styled not-found", async ({ page }) => {
    await page.goto("/dashboard/nope");

    // The styled dashboard not-found renders a glass-panel card with "Page not found"
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByText("This dashboard page doesn't exist")).toBeVisible();

    // "Back to dashboard" button is present
    await expect(page.getByRole("link", { name: /Back to dashboard/i })).toBeVisible();
  });
});
