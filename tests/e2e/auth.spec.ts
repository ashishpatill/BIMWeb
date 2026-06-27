import { test, expect } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("clicking Sign in on landing page redirects to Kinde", async ({ page }) => {
    test.skip(
      !process.env.E2E_BASE_URL,
      "Skipped: requires reachable Kinde auth URL. Run via CI with E2E_BASE_URL set.",
    );

    await page.goto("/");
    const signInLink = page.getByRole("link", { name: "Sign in" });
    await expect(signInLink).toBeVisible();

    // Click and wait for navigation to Kinde
    await Promise.all([
      page.waitForURL(/kinde\.com/, { timeout: 15_000 }),
      signInLink.click(),
    ]);

    expect(page.url()).toContain("kinde.com");
  });
});
