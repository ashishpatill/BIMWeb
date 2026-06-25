import { DeploymentsClient } from "./deployments-client";
import { bimCloud, EcosystemError, type CloudQueryResponse } from "@/lib/api-clients";

export const dynamic = "force-dynamic";

async function fetchInitialHealth(): Promise<{
  health: { gateway: string; agent: string; circuit_breaker: string } | null;
  healthError: string | null;
}> {
  try {
    const health = await bimCloud.health();
    return { health, healthError: null };
  } catch (err) {
    const message = err instanceof EcosystemError ? err.message : (err as Error).message;
    return { health: null, healthError: message };
  }
}

export default async function DeploymentsPage() {
  const { health, healthError } = await fetchInitialHealth();
  return <DeploymentsClient initialHealth={health} initialHealthError={healthError} />;
}

export type { CloudQueryResponse };
