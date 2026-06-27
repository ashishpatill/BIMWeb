/** Multi-tenant workspace isolation. */
import { db } from "@/db"
import { workspaces } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function createWorkspace(name: string, ownerId: string) {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name, ownerId })
    .returning()
  return workspace
}

export async function getWorkspace(workspaceId: number) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
  return workspace
}

export async function getUserWorkspaces(userId: string) {
  return db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
}
