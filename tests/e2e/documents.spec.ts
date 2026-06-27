import { test, expect } from "@playwright/test";

/**
 * Documents: upload a document via /dashboard/documents, observe pipeline
 * status (Queued → Parsing → Indexing → Ready/Failed).
 * Requires live Kinde + Neon + BIMExtract ecosystem service.
 */

test.describe("Documents & Ingestion", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires live Kinde + Neon + BIMExtract ecosystem service. Run via CI with E2E_BASE_URL set.",
  );

  test("upload dropzone is visible on documents page", async ({ page }) => {
    await page.goto("/dashboard/documents");
    // Upload dropzone area
    await expect(page.getByText(/upload|drop|documents/i)).toBeVisible();
  });

  test("upload a PDF shows pipeline status", async ({ page }) => {
    await page.goto("/dashboard/documents");
    // Find the file input (hidden inside dropzone) and set a test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-report.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("dummy PDF content"),
    });
    // The upload should start and a pipeline status row should appear
    await expect(page.getByText(/queued|parsing|indexing|ready|failed/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
