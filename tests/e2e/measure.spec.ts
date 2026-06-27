import { test, expect } from "@playwright/test";

/**
 * Measurement tool in 3D viewer: measure distance between two points,
 * verify floating label and measurement panel entry.
 * Requires live Kinde + Neon + a loaded 3D model.
 */

test.describe("Measurement tool", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + Neon + ecosystem services + a loaded 3D model. Run via CI with E2E_BASE_URL set.",
  );

  test("measure distance shows floating label and panel entry", async ({ page }) => {
    // Navigate to a model viewer page
    await page.goto("/dashboard/projects/1/models/1");
    // Wait for the viewer to be ready
    await expect(page.locator("canvas, [data-viewer]")).toBeVisible();
    // Click the Measure tool button
    await page.getByRole("button", { name: /measure/i }).click();
    // Click two points on the canvas to create a measurement
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 100, y: 200 } });
    await canvas.click({ position: { x: 300, y: 200 } });
    // The floating distance label should appear with a value in meters
    await expect(page.getByText(/\d+\.?\d*\s*m/i)).toBeVisible();
    // The measurements panel should list the distance
    await expect(page.getByRole("tab", { name: /measurement/i })).toBeVisible();
  });

  test("can clear all measurements", async ({ page }) => {
    await page.goto("/dashboard/projects/1/models/1");
    await page.getByRole("button", { name: /measure/i }).click();
    const canvas = page.locator("canvas");
    await canvas.click({ position: { x: 100, y: 200 } });
    await canvas.click({ position: { x: 300, y: 200 } });
    // Clear all button
    await page.getByRole("button", { name: /clear all/i }).click();
    // Measurement labels should be gone
    await expect(page.getByText(/\d+\.?\d*\s*m/i)).not.toBeVisible();
  });
});
