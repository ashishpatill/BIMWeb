/**
 * Public REST API v1 — Documents endpoint.
 *
 * GET  /api/v1/documents  → list indexed documents
 * POST /api/v1/documents  → create/ingest a document
 *
 * @security Auth + scope.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, projects } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, respondBadRequest, respondNotFound } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const result = await requireAuth(request, "projects:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  // Get projects owned by the user
  const ownedProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, userId));

  const projectIds = ownedProjects.map((p) => p.id);

  if (projectIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // If filtering by projectId, verify ownership
  if (projectId) {
    const pid = Number(projectId);
    if (!Number.isFinite(pid)) {
      return respondBadRequest("Invalid projectId");
    }
    if (!projectIds.includes(pid)) {
      return respondNotFound("Project");
    }
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, pid));
    return NextResponse.json({ data: docs });
  }

  // Return documents for all owned projects
  const docs = await db
    .select()
    .from(documents)
    .where(inArray(documents.projectId, projectIds));

  return NextResponse.json({ data: docs });
}

export async function POST(request: NextRequest) {
  const result = await requireAuth(request, "documents:write");
  if ("error" in result) {
    // Fallback: if documents:write not present, try projects:write
    const fallback = await requireAuth(request, "projects:write");
    if ("error" in fallback) return fallback.error;
  }
  // Re-fetch auth for the fallback case
  const authResult = await requireAuth(request, "projects:write");
  if ("error" in authResult) return authResult.error;
  const { userId } = authResult.auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respondBadRequest("Invalid JSON body");
  }

  if (!body.name || typeof body.name !== "string") {
    return respondBadRequest("name is required (string)");
  }

  if (!body.fileUrl || typeof body.fileUrl !== "string") {
    return respondBadRequest("fileUrl is required (string)");
  }

  if (!body.projectId || typeof body.projectId !== "number") {
    return respondBadRequest("projectId is required (number)");
  }

  // Verify project ownership
  const projectRows = await db
    .select({ id: projects.id, ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, Number(body.projectId)))
    .limit(1);

  if (projectRows.length === 0) {
    return respondNotFound("Project");
  }

  if (projectRows[0].ownerId !== userId) {
    return respondNotFound("Project");
  }

  const mimeType =
    body.mimeType && typeof body.mimeType === "string" ? body.mimeType : null;

  const [doc] = await db
    .insert(documents)
    .values({
      workspaceId: 1, // Default workspace — in a full multi-tenant system, resolve from context
      projectId: Number(body.projectId),
      name: (body.name as string).trim(),
      fileUrl: body.fileUrl as string,
      mimeType,
      status: "pending",
      chunks: 0,
    })
    .returning();

  await logAction({
    action: "api_create_document",
    actorId: userId,
    targetType: "document",
    targetId: doc.id,
    metadata: {
      name: doc.name,
      projectId: doc.projectId,
      mimeType,
      source: "api",
    },
  });

  return NextResponse.json({ data: doc }, { status: 201 });
}
