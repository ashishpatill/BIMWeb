/**
 * Role-Based Access Control for BIMWeb.
 *
 * @security Pro verify mandatory.
 */

import { getSessionUser } from "@/lib/session";
import { db } from "@/db";
import { projects, teamMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type Role = "admin" | "editor" | "viewer";

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export async function getUserRole(
  userId: string,
  projectId: number
): Promise<Role | null> {
  const project = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project.length > 0 && project[0].ownerId === userId) {
    return "admin";
  }

  const userRecord = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.kindeId, userId))
    .limit(1);

  if (userRecord.length === 0) return null;

  const member = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.projectId, projectId),
        eq(teamMembers.email, userRecord[0].email)
      )
    )
    .limit(1);

  return member.length > 0 ? (member[0].role as Role) : null;
}

export async function requireRole(
  projectId: number,
  requiredRole: Role
): Promise<{ allowed: boolean; userId: string }> {
  const user = await getSessionUser();

  if (!user?.id) {
    return { allowed: false, userId: "" };
  }

  const role = await getUserRole(user.id, projectId);
  if (!role || !hasMinRole(role, requiredRole)) {
    return { allowed: false, userId: user.id };
  }

  return { allowed: true, userId: user.id };
}

export async function requireProjectAccess(
  projectId: number
): Promise<{ allowed: boolean; userId: string }> {
  return requireRole(projectId, "viewer");
}

export async function requireProjectWriteAccess(
  projectId: number
): Promise<{ allowed: boolean; userId: string }> {
  return requireRole(projectId, "editor");
}

export async function requireProjectAdminAccess(
  projectId: number
): Promise<{ allowed: boolean; userId: string }> {
  return requireRole(projectId, "admin");
}
