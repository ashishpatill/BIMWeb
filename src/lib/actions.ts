"use server";

import { db } from "@/db";
import { users, projects, models, teamMembers, workspaces } from "@/db/schema";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Sync Kinde user with our Neon DB
export async function syncUser() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id || !user.email) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.kindeId, user.id))
      .limit(1);

    if (existing.length === 0) {
      const name = `${user.given_name || ""} ${user.family_name || ""}`.trim() || null;
      await db.insert(users).values({
        kindeId: user.id,
        email: user.email,
        name,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing user:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Get user profile/db details
export async function getDbUser() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user || !user.id) return null;

  try {
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.kindeId, user.id))
      .limit(1);
    return dbUsers[0] || null;
  } catch {
    return null;
  }
}

// Create a new project
export async function createProject(name: string, description?: string) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (!name || name.trim() === "") {
    return { success: false, error: "Project name is required" };
  }

  try {
    // Ensure user exists in db
    await syncUser();

    const [newProject] = await db.insert(projects).values({
      name: name.trim(),
      description: description?.trim() || null,
      ownerId: user.id,
    }).returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    return { success: true, project: newProject };
  } catch (error) {
    console.error("Error creating project:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Get projects for current user
export async function getProjects() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) return [];

  try {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, user.id));
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

// Create a new model in a project
export async function createModel(projectId: number, name: string, description?: string, fileSize: string = "0 KB", fileUrl?: string) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const [newModel] = await db.insert(models).values({
      name: name.trim(),
      description: description?.trim() || null,
      projectId,
      fileSize,
      fileUrl: fileUrl || null,
      status: "completed",
    }).returning();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/models");
    return { success: true, model: newModel };
  } catch (error) {
    console.error("Error creating model:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Get models (optionally filtered by projectId)
export async function getModels(projectId?: number) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) return [];

  try {
    if (projectId) {
      return await db
        .select()
        .from(models)
        .where(eq(models.projectId, projectId));
    }

    // Otherwise, fetch all models of all projects owned by the user
    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, user.id));

    if (userProjects.length === 0) return [];

    const projectIds = userProjects.map(p => p.id);
    const allModels = [];
    for (const pid of projectIds) {
      const ms = await db.select().from(models).where(eq(models.projectId, pid));
      allModels.push(...ms);
    }
    return allModels;
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
}

// Get a single project by id (with ownership check)
export async function getProject(projectId: number) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user || !user.id) return null;

  try {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    const project = result[0];
    if (!project) return null;
    if (project.ownerId !== user.id) {
      if (!user.email) return null;
      const memberAccess = await db
        .select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.projectId, projectId),
          eq(teamMembers.email, user.email)
        ))
        .limit(1);
      if (memberAccess.length === 0) return null;
    }
    return project;
  } catch {
    return null;
  }
}

// Update a project
export async function updateProject(projectId: number, name: string, description?: string) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user || !user.id) return { success: false, error: "Not authenticated" };

  try {
    const existing = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (existing.length === 0) return { success: false, error: "Project not found" };
    if (existing[0].ownerId !== user.id) return { success: false, error: "Not authorized" };

    await db.update(projects)
      .set({ name: name.trim(), description: description?.trim() || null })
      .where(eq(projects.id, projectId));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error) {
    console.error("Error updating project:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Delete a project
export async function deleteProject(projectId: number) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user || !user.id) return { success: false, error: "Not authenticated" };

  try {
    const existing = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (existing.length === 0) return { success: false, error: "Project not found" };
    if (existing[0].ownerId !== user.id) return { success: false, error: "Not authorized" };

    await db.delete(projects).where(eq(projects.id, projectId));
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error) {
    console.error("Error deleting project:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Delete a model
export async function deleteModel(modelId: number) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user || !user.id) return { success: false, error: "Not authenticated" };

  try {
    const existing = await db
      .select({ id: models.id, projectId: models.projectId })
      .from(models)
      .where(eq(models.id, modelId))
      .limit(1);
    if (existing.length === 0) return { success: false, error: "Model not found" };

    const project = await db.select().from(projects).where(eq(projects.id, existing[0].projectId)).limit(1);
    if (project.length === 0 || project[0].ownerId !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    await db.delete(models).where(eq(models.id, modelId));
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/models");
    return { success: true };
  } catch (error) {
    console.error("Error deleting model:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Remove a team member
export async function removeTeamMember(memberId: number) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user || !user.id) return { success: false, error: "Not authenticated" };

  try {
    const member = await db
      .select({ id: teamMembers.id, projectId: teamMembers.projectId })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);
    if (member.length === 0) return { success: false, error: "Member not found" };

    const project = await db.select().from(projects).where(eq(projects.id, member[0].projectId)).limit(1);
    if (project.length === 0 || project[0].ownerId !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));
    revalidatePath("/dashboard/team");
    return { success: true };
  } catch (error) {
    console.error("Error removing team member:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Add team member to project
export async function addTeamMember(projectId: number, email: string, role: string = "viewer") {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const [newMember] = await db.insert(teamMembers).values({
      projectId,
      email: email.trim(),
      role,
    }).returning();

    revalidatePath("/dashboard/team");
    return { success: true, member: newMember };
  } catch (error) {
    console.error("Error adding team member:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Get all team members of user's projects
export async function getTeamMembers() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) return [];

  try {
    const userProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.ownerId, user.id));

    if (userProjects.length === 0) return [];

    const projectIds = userProjects.map(p => p.id);
    const allMembers = [];
    for (const pid of projectIds) {
      const ms = await db.select().from(teamMembers).where(eq(teamMembers.projectId, pid));
      const pName = userProjects.find(p => p.id === pid)?.name || "";
      allMembers.push(...ms.map(m => ({ ...m, projectName: pName })));
    }
    return allMembers;
  } catch (error) {
    console.error("Error fetching team members:", error);
    return [];
  }
}
