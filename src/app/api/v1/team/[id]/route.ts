/**
 * Public REST API v1 — Single team member endpoint.
 *
 * DELETE /api/v1/team/:id  → remove a team member
 * PATCH  /api/v1/team/:id  → change a team member's role
 *
 * @security Auth + scope. Only project owner/admin can modify team members.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, respondNotFound, respondBadRequest } from "@/app/api/v1/_auth";
import { logAction } from "@/lib/audit";

const VALID_ROLES = ["admin", "editor", "viewer"];

/** Fetch a team member row and verify the caller owns the parent project. */
async function getMemberWithOwnershipCheck(
  memberId: number,
  userId: string,
) {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, memberId))
    .limit(1);

  if (rows.length === 0) return null;

  const member = rows[0];

  // Verify caller owns the project
  const projectRows = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, member.projectId))
    .limit(1);

  if (projectRows.length === 0 || projectRows[0].ownerId !== userId) {
    return null;
  }

  return member;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth(request, "projects:write");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) {
    return respondBadRequest("Invalid team member ID");
  }

  const member = await getMemberWithOwnershipCheck(memberId, userId);
  if (!member) {
    return respondNotFound("Team member");
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

  await logAction({
    action: "api_remove_team_member",
    actorId: userId,
    targetType: "team_member",
    targetId: memberId,
    metadata: { email: member.email, projectId: member.projectId, source: "api" },
  });

  return NextResponse.json({ data: { id: memberId, deleted: true } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth(request, "projects:write");
  if ("error" in result) return result.error;
  const { userId } = result.auth;

  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) {
    return respondBadRequest("Invalid team member ID");
  }

  const member = await getMemberWithOwnershipCheck(memberId, userId);
  if (!member) {
    return respondNotFound("Team member");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respondBadRequest("Invalid JSON body");
  }

  if (!body.role || typeof body.role !== "string") {
    return respondBadRequest("role is required (string: admin|editor|viewer)");
  }

  if (!VALID_ROLES.includes(body.role)) {
    return respondBadRequest(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  const [updated] = await db
    .update(teamMembers)
    .set({ role: body.role })
    .where(eq(teamMembers.id, memberId))
    .returning();

  await logAction({
    action: "api_update_team_member_role",
    actorId: userId,
    targetType: "team_member",
    targetId: memberId,
    metadata: {
      email: member.email,
      projectId: member.projectId,
      oldRole: member.role,
      newRole: body.role,
      source: "api",
    },
  });

  return NextResponse.json({ data: updated });
}
