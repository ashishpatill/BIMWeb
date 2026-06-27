/**
 * Public REST API v1 — Models endpoint.
 *
 * GET  /api/v1/models             → list models (optionally filtered by projectId)
 * POST /api/v1/models             → create a new model
 *
 * @security Auth via shared _auth.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { models, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, respondBadRequest } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";

const MAX_LIMIT = 100;
const MAX_NAME_LENGTH = 256;

function sanitize(str: string, maxLen: number): string {
  return str.replace(/[<>&'"]/g, "").slice(0, maxLen);
}

export async function GET(request: NextRequest) {
  const result = await requireAuth(request, "models:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 20, MAX_LIMIT));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  // Only return models belonging to projects owned by the API key user
  const query = db
    .select({
      id: models.id,
      name: models.name,
      description: models.description,
      projectId: models.projectId,
      fileSize: models.fileSize,
      fileUrl: models.fileUrl,
      status: models.status,
      createdAt: models.createdAt,
    })
    .from(models)
    .innerJoin(projects, eq(models.projectId, projects.id))
    .where(
      projectId
        ? eq(models.projectId, Number(projectId))
        : eq(projects.ownerId, userId),
    )
    .limit(limit)
    .offset(offset);

  const result2 = await query;
  return NextResponse.json({
    data: result2,
    pagination: { limit, offset },
  });
}

export async function POST(request: NextRequest) {
  const result = await requireAuth(request, "models:write");
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

  if (!body.projectId || typeof body.projectId !== "number") {
    return respondBadRequest("projectId is required (number)");
  }

  // Verify the project exists and belongs to the user
  const projectRows = await db
    .select({ id: projects.id, ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, Number(body.projectId)))
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (projectRows[0].ownerId !== userId) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [model] = await db
    .insert(models)
    .values({
      name: sanitize(body.name.trim(), MAX_NAME_LENGTH),
      description:
        body.description && typeof body.description === "string"
          ? sanitize(body.description, 2048)
          : null,
      projectId: Number(body.projectId),
      fileSize: String(body.fileSize ?? "0"),
      fileUrl: body.fileUrl && typeof body.fileUrl === "string" ? body.fileUrl : null,
      status: "processing",
    })
    .returning();

  // Audit log
  await logAction({
    action: "api_create_model",
    actorId: userId,
    targetType: "model",
    targetId: model.id,
    metadata: { name: model.name, projectId: model.projectId, source: "api" },
  });

  return NextResponse.json({ data: model }, { status: 201 });
}
