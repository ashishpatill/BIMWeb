import { test, expect } from "@playwright/test";

/**
 * Project CRUD: create, edit, duplicate, and delete projects via the
 * /dashboard/projects page. Requires live Kinde + Neon.
 */

test.describe("Project CRUD", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + Neon + ecosystem services. Run via CI with E2E_BASE_URL set.",
  );

  test("create a new project", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.getByRole("button", { name: /new project/i }).click();
    await page.getByLabel(/name/i).fill("E2E Test Project");
    await page.getByRole("button", { name: /create|save/i }).click();
    await expect(page.getByText("E2E Test Project")).toBeVisible();
  });

  test("edit a project name", async ({ page }) => {
    await page.goto("/dashboard/projects");
    // Open the context menu and select Edit
    const projectCard = page.locator("text=E2E Test Project").first();
    await projectCard.locator("..").getByRole("button", { name: /more|menu/i }).click();
    await page.getByRole("menuitem", { name: /edit/i }).click();
    await page.getByLabel(/name/i).fill("E2E Test Project (edited)");
    await page.getByRole("button", { name: /save|update/i }).click();
    await expect(page.getByText("E2E Test Project (edited)")).toBeVisible();
  });

  test("delete a project with confirmation", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const projectCard = page.locator("text=E2E Test Project (edited)").first();
    await projectCard.locator("..").getByRole("button", { name: /more|menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    // Confirm dialog
    await page.getByRole("button", { name: /delete|confirm/i }).click();
    await expect(page.getByText("E2E Test Project (edited)")).not.toBeVisible();
  });
});
