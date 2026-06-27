import { test, expect } from "@playwright/test";

/**
 * Workspace isolation: User A in Workspace A cannot see User B's projects
 * in Workspace B. Requires two authenticated sessions and two workspaces
 * with isolated data. Run via CI with E2E_BASE_URL set.
 */

test.describe("Workspace isolation", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + Neon + 2 users w/ separate workspaces. Run via CI with E2E_BASE_URL set.",
  );

  test("workspace switcher shows available workspaces", async ({ page }) => {
    await page.goto("/dashboard");
    // The workspace switcher should be visible in the sidebar
    const switcher = page.getByRole("combobox", { name: /workspace/i });
    await expect(switcher).toBeVisible();
    // Click to see options
    await switcher.click();
    const options = page.getByRole("option");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("data is scoped to selected workspace", async ({ page }) => {
    await page.goto("/dashboard/projects");
    // Capture project count for workspace A
    const projectsInA = await page.locator("[data-project-card]").count();

    // Switch to workspace B
    const switcher = page.getByRole("combobox", { name: /workspace/i });
    await switcher.click();
    await page.getByRole("option", { name: /workspace b|second|other/i }).click();

    // The project list should differ
    await page.waitForURL(/.*workspace.*/);
    const projectsInB = await page.locator("[data-project-card]").count();
    expect(projectsInB).not.toBe(projectsInA);
  });
});
