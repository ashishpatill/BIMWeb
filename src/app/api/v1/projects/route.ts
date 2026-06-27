/**
 * Public REST API v1 — Projects endpoint.
 *
 * GET  /api/v1/projects    → list projects owned by API key user
 * POST /api/v1/projects    → create a new project
 *
 * @security Auth via shared _auth.ts (Bearer token → per-key rate limit +
 *           constant-time hash compare + scope enforcement).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, respondBadRequest } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";

const MAX_LIMIT = 100;
const MAX_NAME_LENGTH = 256;
const MAX_DESC_LENGTH = 2048;

function sanitize(str: string, maxLen: number): string {
  return str.replace(/[<>&'"]/g, "").slice(0, maxLen);
}

export async function GET(request: NextRequest) {
  const result = await requireAuth(request, "projects:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { searchParams } = new URL(request.url);
  const rawLimit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 20, MAX_LIMIT));
  const rawOffset = Math.max(0, Number(searchParams.get("offset")) || 0);

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .limit(rawLimit)
    .offset(rawOffset);

  return NextResponse.json({
    data: userProjects,
    pagination: { limit: rawLimit, offset: rawOffset, total: userProjects.length },
  });
}

export async function POST(request: NextRequest) {
  const result = await requireAuth(request, "projects:write");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respondBadRequest("Invalid JSON body");
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return respondBadRequest("name is required (non-empty string)");
  }

  const [project] = await db
    .insert(projects)
    .values({
      name: sanitize(body.name.trim(), MAX_NAME_LENGTH),
      description:
        body.description && typeof body.description === "string"
          ? sanitize(body.description, MAX_DESC_LENGTH)
          : null,
      ownerId: userId,
    })
    .returning();

  // Audit log
  await logAction({
    action: "api_create_project",
    actorId: userId,
    targetType: "project",
    targetId: project.id,
    metadata: { name: project.name, source: "api" },
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
