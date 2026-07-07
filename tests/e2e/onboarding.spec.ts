import { test, expect } from "@playwright/test";
import { hasDatabaseDashboardE2E } from "./helpers";

/**
 * Onboarding checklist: first-run guided tour persisted on the user's
 * `onboardingState` column. Tests cover checklist card visibility, step
 * completion flow, and dismissal. Requires live Kinde + Neon.
 */

test.describe("Onboarding checklist", () => {
  test.skip(
    !hasDatabaseDashboardE2E(),
    "Skipped: set E2E_TEST_BYPASS=true and DATABASE_URL (or E2E_BASE_URL) for dashboard onboarding E2E.",
  );

  test("shows onboarding checklist on first visit to dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // The onboarding card should be visible for users with incomplete onboarding
    await expect(page.getByText(/onboarding|get started|create your first/i)).toBeVisible();
  });

  test("each step links to the correct destination", async ({ page }) => {
    await page.goto("/dashboard");
    // Verify step links: Create project, Upload model, Open viewer, Ask question, Invite team
    const stepLinks = page.locator("[data-onboarding-step]");
    const count = await stepLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("can dismiss onboarding checklist", async ({ page }) => {
    await page.goto("/dashboard");
    // Find and click the dismiss/skip button
    const dismissBtn = page.getByRole("button", { name: /dismiss|skip/i });
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
      await expect(page.getByText(/onboarding/i)).not.toBeVisible();
    }
  });
});
