/** True when dashboard routes can run without live Kinde (CI bypass or staging URL). */
export function hasDashboardE2E(): boolean {
  return (
    process.env.E2E_TEST_BYPASS === "true" || Boolean(process.env.E2E_BASE_URL)
  );
}

/** Dashboard E2E against local dev server with Neon (CI bypass + DATABASE_URL). */
export function hasDatabaseDashboardE2E(): boolean {
  return hasDashboardE2E() && Boolean(process.env.DATABASE_URL);
}

/** Dashboard E2E with docker-compose backends (meta-repo CI). */
export function hasFullStackDashboardE2E(): boolean {
  return hasDatabaseDashboardE2E() && hasEcosystemE2E();
}

/** True when backend services (docker-compose) are expected to be up. */
export function hasEcosystemE2E(): boolean {
  return process.env.ECOSYSTEM_E2E === "true";
}

export const ECOSYSTEM_SERVICES = {
  BIMAgent: process.env.BIMAGENT_URL || "http://127.0.0.1:8000",
  BIMIndex: process.env.BIMINDEX_URL || "http://127.0.0.1:8001",
  BIMCloud: process.env.BIMCLOUD_URL || "http://127.0.0.1:8080",
  BIMExtract: process.env.BIMEXTRACT_URL || "http://127.0.0.1:8200",
} as const;
