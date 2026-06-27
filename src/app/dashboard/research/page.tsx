import { getEcosystemHealth } from "@/lib/api-clients";
import { getSearchHistory } from "@/lib/actions";
import { ResearchClient } from "./research-client";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const [health, history] = await Promise.all([
    getEcosystemHealth().catch(() => ({
      BIMAgent: { status: "unreachable", ok: false },
      BIMCloud: { status: "unreachable", ok: false },
      BIMIndex: { status: "unreachable", ok: false },
      BIMExtract: { status: "unreachable", ok: false },
    })),
    getSearchHistory(20),
  ]);

  return <ResearchClient ecosystemHealth={health} searchHistory={history} />;
}
