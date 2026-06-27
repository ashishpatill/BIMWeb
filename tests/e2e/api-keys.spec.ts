import { test, expect } from "@playwright/test";

/**
 * API key lifecycle: create → copy → use in REST API call → revoke.
 * Requires live Kinde + Neon.
 */

test.describe("API keys", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + Neon. Run via CI with E2E_BASE_URL set.",
  );

  test("create API key dialog opens", async ({ page }) => {
    await page.goto("/dashboard/api-keys");
    await page.getByRole("button", { name: /create key/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(/label/i)).toBeVisible();
  });

  test("create API key shows one-time reveal with copy", async ({ page }) => {
    await page.goto("/dashboard/api-keys");
    await page.getByRole("button", { name: /create key/i }).click();
    await page.getByLabel(/label/i).fill("E2E Test Key");
    await page.getByRole("button", { name: /create/i }).click();
    // The one-time reveal modal should show the key
    await expect(page.getByText(/sk_/i)).toBeVisible();
    // Copy button should be present
    await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
    // Warning text about not seeing it again
    await expect(page.getByText(/won't see this again/i)).toBeVisible();
  });

  test("revoke API key via confirm dialog", async ({ page }) => {
    await page.goto("/dashboard/api-keys");
    // Find a key and open its context menu
    const menuBtn = page.locator("button", { hasText: /revoke|more/i }).first();
    await menuBtn.click();
    await page.getByRole("menuitem", { name: /revoke/i }).click();
    // Confirm dialog
    await page.getByRole("button", { name: /revoke|confirm/i }).click();
    // Key should now show as revoked
    await expect(page.getByText(/revoked/i)).toBeVisible();
  });
});
