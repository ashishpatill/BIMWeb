/**
 * Project sharing and activity feed.
 */

import { db } from "@/db";
import { projects, teamMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logAction } from "@/lib/audit";

export async function shareProject(
  projectId: number,
  targetEmail: string,
  permission: "viewer" | "editor" = "viewer",
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const project = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return { success: false, error: "Project not found" };
    }
    if (project[0].ownerId !== actorId) {
      return { success: false, error: "Only the project owner can share" };
    }

    const existing = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.projectId, projectId),
          eq(teamMembers.email, targetEmail)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "User is already a team member" };
    }

    await db.insert(teamMembers).values({
      projectId,
      email: targetEmail,
      role: permission,
    });

    await logAction({
      action: "project_shared",
      actorId,
      targetType: "project",
      targetId: projectId,
      metadata: { sharedWith: targetEmail, permission },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to share project" };
  }
}

export async function unshareProject(
  memberId: number,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const member = await db
      .select({ projectId: teamMembers.projectId })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    if (member.length === 0) {
      return { success: false, error: "Team member not found" };
    }

    const project = await db
      .select({ ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, member[0].projectId))
      .limit(1);

    if (project.length === 0 || project[0].ownerId !== actorId) {
      return { success: false, error: "Only the project owner can unshare" };
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

    await logAction({
      action: "project_unshared",
      actorId,
      targetType: "team_member",
      targetId: memberId,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to unshare project" };
  }
}

export async function getSharedProjects(userId: string) {
  const userRecord = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.kindeId, userId))
    .limit(1);

  if (userRecord.length === 0) return [];

  const shared = await db
    .select({
      project: projects,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(projects, eq(teamMembers.projectId, projects.id))
    .where(eq(teamMembers.email, userRecord[0].email));

  return shared;
}
