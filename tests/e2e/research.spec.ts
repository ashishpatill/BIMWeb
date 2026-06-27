import { test, expect } from "@playwright/test";

/**
 * Research: ask a question via /dashboard/research, see grounded answer
 * with source cards and trace timeline. Requires live Kinde + Neon
 * + BIMAgent + BIMIndex ecosystem services.
 */

test.describe("Research", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + BIMAgent + BIMIndex. Run via CI with E2E_BASE_URL set.",
  );

  test("search input and example chips are present", async ({ page }) => {
    await page.goto("/dashboard/research");
    // Search input should be visible
    await expect(page.getByRole("textbox", { name: /search|ask|query/i })).toBeVisible();
    // Example query chips
    await expect(page.getByText(/fire rating|curtain wall|structural report/i)).toBeVisible();
  });

  test("submitting a query shows answer and sources", async ({ page }) => {
    await page.goto("/dashboard/research");
    const searchInput = page.getByRole("textbox", { name: /search|ask|query/i });
    await searchInput.fill("What is the fire rating on floor 3?");
    await page.getByRole("button", { name: /search|ask|submit/i }).click();
    // Answer panel should appear
    await expect(page.getByText(/searching|answer/i)).toBeVisible({ timeout: 10_000 });
    // Source cards should be present (may take time to load)
    await expect(page.locator("[data-source-card]").first()).toBeVisible({ timeout: 30_000 });
  });

  test("mode selector switches between Smart, Keyword, Semantic, Relationships", async ({ page }) => {
    await page.goto("/dashboard/research");
    const modes = [/Smart/i, /Keyword/i, /Semantic/i, /Relationships/i];
    for (const mode of modes) {
      const tab = page.getByRole("tab", { name: mode });
      await expect(tab).toBeVisible();
    }
  });
});
