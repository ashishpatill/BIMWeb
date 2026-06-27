/**
 * Public REST API v1 — Single model endpoint.
 *
 * GET    /api/v1/models/:id  → get model details
 * DELETE /api/v1/models/:id  → delete model
 *
 * @security Auth + scope + ownership (model's project must belong to key user).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { models, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, respondNotFound, respondBadRequest } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";

/** Fetch a model row if the user owns the parent project. Returns null otherwise. */
async function getOwnedModel(modelId: number, userId: string) {
  const rows = await db
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
    .where(eq(models.id, modelId))
    .limit(1);

  if (rows.length === 0) return null;
  if (rows[0].projectId === undefined) return null;

  // Verify ownership through the parent project
  const projectRows = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, rows[0].projectId))
    .limit(1);

  if (projectRows.length === 0 || projectRows[0].ownerId !== userId) {
    return null;
  }

  return rows[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth(request, "models:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { id } = await params;
  const modelId = Number(id);
  if (!Number.isFinite(modelId)) {
    return respondBadRequest("Invalid model ID");
  }

  const model = await getOwnedModel(modelId, userId);
  if (!model) {
    return respondNotFound("Model");
  }

  return NextResponse.json({ data: model });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth(request, "models:write");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { id } = await params;
  const modelId = Number(id);
  if (!Number.isFinite(modelId)) {
    return respondBadRequest("Invalid model ID");
  }

  const model = await getOwnedModel(modelId, userId);
  if (!model) {
    return respondNotFound("Model");
  }

  await db.delete(models).where(eq(models.id, modelId));

  await logAction({
    action: "api_delete_model",
    actorId: userId,
    targetType: "model",
    targetId: modelId,
    metadata: { name: model.name, source: "api" },
  });

  return NextResponse.json({ data: { id: modelId, deleted: true } });
}
