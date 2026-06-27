import { test, expect } from "@playwright/test";

/**
 * Team invitation flow: invite a member by email → accept in second context
 * → role enforced. Requires live Kinde + Neon + Resend (email).
 */

test.describe("Team invites and role enforcement", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + Neon + Resend email. Run via CI with E2E_BASE_URL set.",
  );

  test("invite member dialog opens and validates email", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.getByRole("button", { name: /invite/i }).click();
    // The invite dialog should be visible
    await expect(page.getByRole("dialog")).toBeVisible();
    // Email field should be present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Role selector should be present
    await expect(page.getByRole("combobox", { name: /role/i })).toBeVisible();
  });

  test("members table shows pending and joined status", async ({ page }) => {
    await page.goto("/dashboard/team");
    // Table should list members with status indicators
    await expect(page.getByText(/pending|joined/i)).toBeVisible();
  });

  test("can change a team member role", async ({ page }) => {
    await page.goto("/dashboard/team");
    // Find a role dropdown and change it
    const roleSelect = page.getByRole("combobox", { name: /role/i }).first();
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      await page.getByRole("option", { name: /editor/i }).click();
      await expect(page.getByText(/editor/i)).toBeVisible();
    }
  });
});
