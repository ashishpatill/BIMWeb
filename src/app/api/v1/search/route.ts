/**
 * Public REST API v1 — Search endpoint.
 *
 * POST /api/v1/search  → proxy search to BIMAgent or BIMIndex
 *
 * @security Auth + scope.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, respondBadRequest } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";

const VALID_MODES = ["smart", "keyword", "semantic", "relationships"] as const;
type SearchMode = (typeof VALID_MODES)[number];

function mapMode(mode: string): { backend: "agent" | "index"; indexMode?: string } {
  switch (mode) {
    case "smart":
      return { backend: "agent" };
    case "keyword":
      return { backend: "index", indexMode: "vectorless" };
    case "semantic":
      return { backend: "index", indexMode: "dense" };
    case "relationships":
      return { backend: "index", indexMode: "graph" };
    default:
      return { backend: "agent" };
  }
}

export async function POST(request: NextRequest) {
  const result = await requireAuth(request, "search:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respondBadRequest("Invalid JSON body");
  }

  if (!body.query || typeof body.query !== "string" || body.query.trim().length === 0) {
    return respondBadRequest("query is required (non-empty string)");
  }

  const mode =
    body.mode && typeof body.mode === "string" &&
    VALID_MODES.includes(body.mode as SearchMode)
      ? (body.mode as SearchMode)
      : "smart";

  const { backend, indexMode } = mapMode(mode);

  try {
    if (backend === "agent") {
      const { bimAgent } = await import("@/lib/api-clients");
      const agentResult = await bimAgent.query(body.query as string, userId);

      await logAction({
        action: "api_search",
        actorId: userId,
        targetType: "search",
        targetId: "query",
        metadata: {
          query: (body.query as string).slice(0, 200),
          mode,
          backend: "BIMAgent",
          source: "api",
        },
      });

      return NextResponse.json({
        data: {
          response: agentResult.response,
          trace: agentResult.trace,
          mode,
          backend: "BIMAgent",
        },
      });
    }

    const { bimIndex } = await import("@/lib/api-clients");
    const hits = await bimIndex.search(
      body.query as string,
      indexMode as "vectorless" | "dense" | "graph",
    );

    await logAction({
      action: "api_search",
      actorId: userId,
      targetType: "search",
      targetId: "query",
      metadata: {
        query: (body.query as string).slice(0, 200),
        mode,
        backend: "BIMIndex",
        source: "api",
      },
    });

    return NextResponse.json({
      data: {
        hits,
        mode,
        backend: "BIMIndex",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Search backend error";
    return NextResponse.json(
      { error: `Search failed: ${message}` },
      { status: 502 },
    );
  }
}
