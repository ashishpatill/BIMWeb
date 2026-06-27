/**
 * Public REST API v1 — Single project endpoint.
 *
 * GET    /api/v1/projects/:id  → get project details
 * PATCH  /api/v1/projects/:id  → update project
 * DELETE /api/v1/projects/:id  → delete project (ownership required)
 *
 * @security Auth + scope + ownership checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, respondNotFound, respondBadRequest } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";

const MAX_NAME_LENGTH = 256;
const MAX_DESC_LENGTH = 2048;

function sanitize(str: string, maxLen: number): string {
  return str.replace(/[<>&'"]/g, "").slice(0, maxLen);
}

/** Fetch a project row if owned by userId. Returns null if not found or not owned. */
async function getOwnedProject(projectId: number, userId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (rows.length === 0) return null;
  if (rows[0].ownerId !== userId) return null;
  return rows[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth(request, "projects:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return respondBadRequest("Invalid project ID");
  }

  const project = await getOwnedProject(projectId, userId);
  if (!project) {
    return respondNotFound("Project");
  }

  return NextResponse.json({ data: project });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth(request, "projects:write");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return respondBadRequest("Invalid project ID");
  }

  const project = await getOwnedProject(projectId, userId);
  if (!project) {
    return respondNotFound("Project");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respondBadRequest("Invalid JSON body");
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return respondBadRequest("name must be a non-empty string");
    }
    updates.name = sanitize(body.name.trim(), MAX_NAME_LENGTH);
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return respondBadRequest("description must be a string or null");
    }
    updates.description = body.description
      ? sanitize(body.description as string, MAX_DESC_LENGTH)
      : null;
  }

  if (Object.keys(updates).length === 0) {
    return respondBadRequest("No valid fields to update");
  }

  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, projectId))
    .returning();

  await logAction({
    action: "api_update_project",
    actorId: userId,
    targetType: "project",
    targetId: projectId,
    metadata: { changes: Object.keys(updates), source: "api" },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth(request, "projects:write");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return respondBadRequest("Invalid project ID");
  }

  const project = await getOwnedProject(projectId, userId);
  if (!project) {
    return respondNotFound("Project");
  }

  await db.delete(projects).where(eq(projects.id, projectId));

  await logAction({
    action: "api_delete_project",
    actorId: userId,
    targetType: "project",
    targetId: projectId,
    metadata: { name: project.name, source: "api" },
  });

  return NextResponse.json({ data: { id: projectId, deleted: true } });
}
