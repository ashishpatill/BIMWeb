import { defineConfig, devices } from "@playwright/test";

const WEB_SERVER_ENV_KEYS = [
  "E2E_TEST_BYPASS",
  "DATABASE_URL",
  "E2E_TEST_USER_ID",
  "E2E_TEST_USER_EMAIL",
  "KINDE_ISSUER_URL",
  "KINDE_CLIENT_ID",
  "KINDE_CLIENT_SECRET",
  "KINDE_SITE_URL",
  "KINDE_POST_LOGOUT_REDIRECT_URL",
  "KINDE_POST_LOGIN_REDIRECT_URL",
  "BIMAGENT_URL",
  "BIMINDEX_URL",
  "BIMEXTRACT_URL",
  "BIMCLOUD_URL",
  "NEXT_PUBLIC_BIMAGENT_URL",
  "NEXT_PUBLIC_BIMINDEX_URL",
  "NEXT_PUBLIC_BIMEXTRACT_URL",
  "NEXT_PUBLIC_BIMCLOUD_URL",
  "NEXT_PUBLIC_APP_URL",
  "ECOSYSTEM_E2E",
] as const;

function webServerEnv(): Record<string, string> {
  const env: Record<string, string> = {
    E2E_TEST_BYPASS: process.env.E2E_TEST_BYPASS || "false",
  };

  for (const key of WEB_SERVER_ENV_KEYS) {
    const value = process.env[key];
    if (value) env[key] = value;
  }

  if (process.env.ECOSYSTEM_E2E === "true") {
    env.BIMAGENT_URL = env.BIMAGENT_URL || "http://127.0.0.1:8000";
    env.BIMINDEX_URL = env.BIMINDEX_URL || "http://127.0.0.1:8001";
    env.BIMEXTRACT_URL = env.BIMEXTRACT_URL || "http://127.0.0.1:8200";
    env.BIMCLOUD_URL = env.BIMCLOUD_URL || "http://127.0.0.1:8080";
    env.NEXT_PUBLIC_BIMAGENT_URL = env.NEXT_PUBLIC_BIMAGENT_URL || env.BIMAGENT_URL;
    env.NEXT_PUBLIC_BIMINDEX_URL = env.NEXT_PUBLIC_BIMINDEX_URL || env.BIMINDEX_URL;
    env.NEXT_PUBLIC_BIMEXTRACT_URL = env.NEXT_PUBLIC_BIMEXTRACT_URL || env.BIMEXTRACT_URL;
    env.NEXT_PUBLIC_BIMCLOUD_URL = env.NEXT_PUBLIC_BIMCLOUD_URL || env.BIMCLOUD_URL;
    env.NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  return env;
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: webServerEnv(),
  },
});
