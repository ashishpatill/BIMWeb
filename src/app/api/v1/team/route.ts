/**
 * Public REST API v1 — Team endpoint.
 *
 * GET  /api/v1/team  → list team members across user's projects
 * POST /api/v1/team  → invite a member to a project
 *
 * @security Auth + scope checks. Only project owner/admins can invite.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, projects } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, respondBadRequest, respondNotFound } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";
import crypto from "node:crypto";

export async function GET(request: NextRequest) {
  const result = await requireAuth(request, "projects:read");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get("projectId");

  // Get all projects owned by the user
  const ownedProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, userId));

  const projectIds = ownedProjects.map((p) => p.id);

  // If a specific projectId is requested, verify it's owned
  if (projectIdParam) {
    const pid = Number(projectIdParam);
    if (!Number.isFinite(pid)) {
      return respondBadRequest("Invalid projectId");
    }
    if (!projectIds.includes(pid)) {
      return respondNotFound("Project");
    }
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.projectId, pid));
    return NextResponse.json({ data: members });
  }

  // Return members of all owned projects
  if (projectIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const allMembers = await db
    .select()
    .from(teamMembers)
    .where(inArray(teamMembers.projectId, projectIds));

  return NextResponse.json({ data: allMembers });
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

  if (!body.email || typeof body.email !== "string") {
    return respondBadRequest("email is required (string)");
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
    return respondNotFound("Project");
  }

  if (projectRows[0].ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can invite members" },
      { status: 403 },
    );
  }

  const role =
    body.role && typeof body.role === "string" &&
    ["admin", "editor", "viewer"].includes(body.role)
      ? body.role
      : "viewer";

  // Check if already a member
  const existing = await db
    .select()
    .from(teamMembers)
    .where(
      inArray(teamMembers.projectId, [Number(body.projectId)]),
    );

  const alreadyExists = existing.some(
    (m) => m.email === (body.email as string).toLowerCase().trim(),
  );

  if (alreadyExists) {
    return NextResponse.json(
      { error: "User is already a member of this project" },
      { status: 409 },
    );
  }

  const inviteToken = `inv_${crypto.randomUUID()}`;

  const [member] = await db
    .insert(teamMembers)
    .values({
      projectId: Number(body.projectId),
      email: (body.email as string).toLowerCase().trim(),
      role,
      inviteToken,
    })
    .returning();

  await logAction({
    action: "api_invite_team_member",
    actorId: userId,
    targetType: "team_member",
    targetId: member.id,
    metadata: {
      email: body.email,
      projectId: Number(body.projectId),
      role,
      source: "api",
    },
  });

  return NextResponse.json({ data: member }, { status: 201 });
}
