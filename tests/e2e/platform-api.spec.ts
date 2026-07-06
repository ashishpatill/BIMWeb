import { test, expect } from "@playwright/test";
import { ECOSYSTEM_SERVICES, hasEcosystemE2E } from "./helpers";

/**
 * Direct health checks against the four Python backend services.
 * Run with ECOSYSTEM_E2E=true after `docker compose up -d` at repo root.
 */

test.describe("Platform API health", () => {
  test.skip(
    !hasEcosystemE2E(),
    "Skipped: set ECOSYSTEM_E2E=true with docker-compose backends running.",
  );

  for (const [name, baseUrl] of Object.entries(ECOSYSTEM_SERVICES)) {
    test(`${name} /health returns ok`, async ({ request }) => {
      const response = await request.get(`${baseUrl}/health`);
      expect(response.ok(), `${name} health failed: ${response.status()}`).toBeTruthy();
      const body = await response.json();
      expect(body).toMatchObject({ status: expect.stringMatching(/ok|healthy/i) });
    });
  }

  test("BIMIndex /stats returns backend stats", async ({ request }) => {
    const response = await request.get(`${ECOSYSTEM_SERVICES.BIMIndex}/stats`);
    expect(response.ok()).toBeTruthy();
    const stats = await response.json();
    expect(stats).toHaveProperty("tantivy");
  });
});
