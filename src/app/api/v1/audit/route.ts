/**
 * Public REST API v1 — Audit log endpoint.
 *
 * GET /api/v1/audit  → list audit entries for the API key user
 *
 * @security Auth + scope.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/app/api/v1/_auth";

const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const result = await requireAuth(request, "audit:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { searchParams } = new URL(request.url);
  const rawLimit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 50, MAX_LIMIT));
  const rawOffset = Math.max(0, Number(searchParams.get("offset")) || 0);

  // Optional filters
  const actionFilter = searchParams.get("action");
  const targetTypeFilter = searchParams.get("targetType");

  try {
    const allRows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, userId))
      .orderBy(desc(auditLogs.createdAt));

    let filtered = allRows;
    if (actionFilter) {
      filtered = filtered.filter((r) => r.action === actionFilter);
    }
    if (targetTypeFilter) {
      filtered = filtered.filter((r) => r.targetType === targetTypeFilter);
    }

    const paginated = filtered.slice(rawOffset, rawOffset + rawLimit);

    return NextResponse.json({
      data: paginated,
      pagination: {
        limit: rawLimit,
        offset: rawOffset,
        total: filtered.length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}
