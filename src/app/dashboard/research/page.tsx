import { getEcosystemHealth } from "@/lib/api-clients";
import { getSearchHistory, getModels } from "@/lib/actions";
import { ResearchClient } from "./research-client";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const [health, history, models] = await Promise.all([
    getEcosystemHealth().catch(() => ({
      BIMAgent: { status: "unreachable", ok: false },
      BIMCloud: { status: "unreachable", ok: false },
      BIMIndex: { status: "unreachable", ok: false },
      BIMExtract: { status: "unreachable", ok: false },
    })),
    getSearchHistory(20),
    getModels(),
  ]);

  const modelIndex = models.map((m) => ({
    id: m.id,
    projectId: m.projectId,
    name: m.name,
  }));

  return (
    <ResearchClient
      ecosystemHealth={health}
      searchHistory={history}
      modelIndex={modelIndex}
    />
  );
}
