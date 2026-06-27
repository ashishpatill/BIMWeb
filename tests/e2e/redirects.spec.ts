import { test, expect } from "@playwright/test";

/**
 * These redirects are implemented as server-side Next.js `redirect()` calls
 * in page components. They require passing through the /dashboard layout,
 * which enforces authentication. Without a valid Kinde session, the layout
 * redirects to `/` before the page-level redirect can fire.
 *
 * Run via CI with E2E_BASE_URL set and a seeded authenticated session.
 */

test.describe("Dashboard redirects", () => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "Skipped: requires authenticated Kinde session to bypass dashboard auth guard. Set E2E_BASE_URL.",
  );

  test("/dashboard/search redirects to /dashboard/research", async ({ page }) => {
    await page.goto("/dashboard/search");
    await page.waitForURL("/dashboard/research");
    expect(page.url()).toContain("/dashboard/research");
  });

  test("/dashboard/deployments redirects to /dashboard/health", async ({ page }) => {
    await page.goto("/dashboard/deployments");
    await page.waitForURL("/dashboard/health");
    expect(page.url()).toContain("/dashboard/health");
  });
});
