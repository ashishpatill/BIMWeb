import { test, expect } from "@playwright/test";
import { hasDashboardE2E } from "./helpers";

test.describe("Landing page", () => {
  test("renders hero, nav links, auth buttons, and all sections", async ({ page }) => {
    await page.goto("/");

    // ── Hero ──
    const hero = page.locator("h1");
    await expect(hero).toContainText("BIM intelligence");
    await expect(hero).toContainText("platform");

    // ── Nav links ──
    await expect(page.getByRole("link", { name: "Features" })).toBeVisible();
    await expect(page.getByRole("link", { name: "How it works" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ecosystem" })).toBeVisible();
    // Docs is an external link
    await expect(page.getByRole("link", { name: /Docs/i })).toBeVisible();

    // ── Auth buttons (anonymous) ──
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    // "Get started" in nav (RegisterLink) or "Start free" in hero (RegisterLink)
    const getStartedOrStartFree = page.locator("a", { hasText: /Get started|Start free/i });
    await expect(getStartedOrStartFree.first()).toBeVisible();

    // "See live demo" link
    await expect(page.getByRole("link", { name: /See live demo/i })).toBeVisible();

    // ── How it works section ──
    const howItWorks = page.locator("#how-it-works");
    await expect(howItWorks).toBeVisible();
    await expect(howItWorks.getByRole("heading", { name: "How it works" })).toBeVisible();

    // ── Features section ──
    const features = page.locator("#features");
    await expect(features).toBeVisible();
    await expect(features.getByText("3D BIM Viewer")).toBeVisible();
    await expect(features.getByText("Smart Search")).toBeVisible();
    await expect(features.getByText("Document Ingestion")).toBeVisible();
    await expect(features.getByText("Team Collaboration")).toBeVisible();
    await expect(features.getByText("REST API Access")).toBeVisible();
    await expect(features.getByText("Platform Health")).toBeVisible();

    // ── Comparison strip ──
    await expect(page.getByText("How BIMWeb compares")).toBeVisible();

    // ── Ecosystem section ──
    const ecosystem = page.locator("#ecosystem");
    await expect(ecosystem).toBeVisible();
    await expect(ecosystem.getByText("Ecosystem architecture")).toBeVisible();

    // ── Footer ──
    await expect(page.getByText(/BIMWeb\. Open source \(MIT\)/)).toBeVisible();
    await expect(page.getByText("GitHub / Repo")).toBeVisible();
  });

  test("signed-in state shows Go to dashboard", async ({ page }) => {
    // This verifies the signed-in rendering path of the landing page.
    // Requires a valid Kinde session cookie — cannot be set without live auth.
    test.skip(
      !hasDashboardE2E(),
      "Skipped: set E2E_TEST_BYPASS=true or E2E_BASE_URL for signed-in landing test.",
    );

    await page.goto("/");
    await expect(page.getByRole("link", { name: /Go to dashboard/i })).toBeVisible();
  });
});
