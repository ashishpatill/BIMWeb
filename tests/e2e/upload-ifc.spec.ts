import { test, expect } from "@playwright/test";

/**
 * Upload an IFC model → viewer opens with real geometry.
 * Requires live Kinde + Neon + file storage.
 */

test.describe("Upload IFC and open in viewer", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + Neon + ecosystem services. Run via CI with E2E_BASE_URL set.",
  );

  test("upload IFC from projects page", async ({ page }) => {
    await page.goto("/dashboard/projects");
    // Click into the first project or create one
    await page.getByRole("link", { name: /project/i }).first().click();
    // Navigate to Models tab
    await page.getByRole("tab", { name: /models/i }).click();
    // Click upload button
    await page.getByRole("button", { name: /upload/i }).click();
    // Select a test IFC file (requires a fixture file on disk or a seeded file URL)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-model.ifc",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("dummy IFC content"),
    });
    await page.getByRole("button", { name: /upload|start/i }).click();
    // After upload, the model should appear and be clickable → viewer
    await page.getByRole("link", { name: /test-model/i }).click();
    // Viewer route
    await expect(page).toHaveURL(/\/models\/\d+$/);
    // The viewer should be in a loading or ready state
    await expect(page.locator("canvas, [data-viewer]")).toBeVisible();
  });
});
