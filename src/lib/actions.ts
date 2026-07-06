"use server";

import crypto from "crypto";
import { db } from "@/db";
import {
  users,
  projects,
  models,
  teamMembers,
  workspaces,
  apiKeys,
  searchHistory,
  documents,
  notificationPreferences,
  auditLogs,
} from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { eq, and, desc, like, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-keys";
import { getEcosystemHealth } from "@/lib/api-clients";
import { logAction } from "@/lib/audit";
import { requireProjectAdminAccess } from "@/lib/rbac";
import { sendInviteEmail } from "@/lib/email";

// Sync Kinde user with our Neon DB
export async function syncUser() {
  const user = await getSessionUser();

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
        firstName: user.given_name || null,
        lastName: user.family_name || null,
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
  const user = await getSessionUser();
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
  const user = await getSessionUser();

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
  const user = await getSessionUser();

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
  const user = await getSessionUser();

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
  const user = await getSessionUser();

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
  const user = await getSessionUser();
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
  const user = await getSessionUser();
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
  const user = await getSessionUser();
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
  const user = await getSessionUser();
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
  const user = await getSessionUser();
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
  const user = await getSessionUser();

  if (!user || !user.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const [newMember] = await db.insert(teamMembers).values({
      projectId,
      email: email.trim(),
      role,
      inviteToken,
    }).returning();

    // Send invite email server-side (failures reported but DB row kept)
    let emailSent = false;
    let emailError: string | undefined;
    try {
      // Get project name
      const projectRows = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      const projectName = projectRows[0]?.name || "Project";

      // Get inviter name
      const dbUser = await db
        .select({ firstName: users.firstName, lastName: users.lastName, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.kindeId, user.id))
        .limit(1);
      const inviterName = dbUser[0]?.firstName
        ? `${dbUser[0].firstName} ${dbUser[0].lastName || ""}`.trim()
        : dbUser[0]?.name || user.given_name || user.email || "Someone";

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${appUrl}/invite?token=${inviteToken}`;

      const emailRes = await sendInviteEmail(email.trim(), inviterName, projectName, inviteUrl, role);
      emailSent = emailRes.success;
      emailError = emailRes.error;
    } catch (emailErr) {
      emailError = String(emailErr);
      // Keep DB row even if email fails
    }

    revalidatePath("/dashboard/team");
    return {
      success: true,
      member: newMember,
      inviteToken,
      emailSent,
      emailError,
    };
  } catch (error) {
    console.error("Error adding team member:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Get all team members of user's projects
export async function getTeamMembers() {
  const user = await getSessionUser();

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
      const ms = await db
        .select({
          id: teamMembers.id,
          projectId: teamMembers.projectId,
          workspaceId: teamMembers.workspaceId,
          email: teamMembers.email,
          role: teamMembers.role,
          inviteToken: teamMembers.inviteToken,
          joinedAt: teamMembers.joinedAt,
          userName: users.name,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(teamMembers)
        .leftJoin(users, eq(teamMembers.email, users.email))
        .where(eq(teamMembers.projectId, pid));
      const pName = userProjects.find(p => p.id === pid)?.name || "";
      allMembers.push(...ms.map(m => ({ ...m, projectName: pName })));
    }
    return allMembers;
  } catch (error) {
    console.error("Error fetching team members:", error);
    return [];
  }
}

// ──────────────────────────────────────────────
// API Keys
// ──────────────────────────────────────────────

/** Create a new API key. Returns the plaintext key ONCE (hash stored). */
export async function createApiKey(
  label: string,
  scopes?: string[],
  rateLimitPerMin?: number,
) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  if (!label || label.trim() === "") {
    return { success: false as const, error: "Label is required" };
  }

  try {
    const { plaintext, prefix, keyHash } = generateApiKey();

    const [row] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        label: label.trim(),
        keyHash,
        prefix,
        scopes: scopes ?? ["projects:read"],
        rateLimitPerMin: rateLimitPerMin ?? 60,
      })
      .returning({ id: apiKeys.id });

    await logAction({
      action: "api_key.create",
      actorId: user.id,
      targetType: "api_key",
      targetId: row.id,
      metadata: { label: label.trim() },
    });

    return { success: true as const, id: row.id, plaintext };
  } catch (error) {
    console.error("Error creating API key:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

/** List current user's API keys (never returns hashes). */
export async function getApiKeys() {
  const user = await getSessionUser();
  if (!user?.id) return [];

  try {
    const rows = await db
      .select({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        label: apiKeys.label,
        scopes: apiKeys.scopes,
        rateLimitPerMin: apiKeys.rateLimitPerMin,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .orderBy(desc(apiKeys.createdAt));

    return rows;
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
}

/** Revoke an API key (soft delete via revokedAt). */
export async function revokeApiKey(id: number) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const existing = await db
      .select({ userId: apiKeys.userId })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (existing.length === 0) return { success: false as const, error: "API key not found" };
    if (existing[0].userId !== user.id) return { success: false as const, error: "Not authorized" };

    await db
      .update(apiKeys)
      .set({ revokedAt: sql`now()` })
      .where(eq(apiKeys.id, id));

    await logAction({
      action: "api_key.revoke",
      actorId: user.id,
      targetType: "api_key",
      targetId: id,
    });

    return { success: true as const };
  } catch (error) {
    console.error("Error revoking API key:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

/** Rotate an API key: revoke old, create new. Returns new plaintext once. */
export async function rotateApiKey(id: number) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const existing = await db
      .select({ userId: apiKeys.userId, label: apiKeys.label, scopes: apiKeys.scopes, rateLimitPerMin: apiKeys.rateLimitPerMin })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (existing.length === 0) return { success: false as const, error: "API key not found" };
    if (existing[0].userId !== user.id) return { success: false as const, error: "Not authorized" };

    // Revoke old key
    await db
      .update(apiKeys)
      .set({ revokedAt: sql`now()` })
      .where(eq(apiKeys.id, id));

    // Create new key with same label/scopes/rateLimit
    const { plaintext, prefix, keyHash } = generateApiKey();

    const [newRow] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        label: existing[0].label,
        keyHash,
        prefix,
        scopes: existing[0].scopes,
        rateLimitPerMin: existing[0].rateLimitPerMin,
      })
      .returning({ id: apiKeys.id });

    await logAction({
      action: "api_key.rotate",
      actorId: user.id,
      targetType: "api_key",
      targetId: newRow.id,
      metadata: { previousKeyId: id },
    });

    return { success: true as const, id: newRow.id, plaintext };
  } catch (error) {
    console.error("Error rotating API key:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

/** Internal helper: record API key usage (update lastUsedAt). Called by REST API. */
export async function recordApiKeyUsage(prefix: string) {
  try {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: sql`now()` })
      .where(eq(apiKeys.prefix, prefix));
  } catch (error) {
    console.error("Error recording API key usage:", error);
  }
}

// ──────────────────────────────────────────────
// Search History
// ──────────────────────────────────────────────

/** Get the current user's search history. */
export async function getSearchHistory(limit = 20) {
  const user = await getSessionUser();
  if (!user?.id) return [];

  try {
    return await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, user.id))
      .orderBy(desc(searchHistory.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Error fetching search history:", error);
    return [];
  }
}

/** Add a search to the user's history. */
export async function addSearchHistory(query: string, mode: string) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  if (!query || query.trim() === "") {
    return { success: false as const, error: "Query is required" };
  }

  try {
    await db.insert(searchHistory).values({
      userId: user.id,
      query: query.trim(),
      mode,
    });
    return { success: true as const };
  } catch (error) {
    console.error("Error adding search history:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

/** Clear the current user's search history. */
export async function clearSearchHistory() {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    await db.delete(searchHistory).where(eq(searchHistory.userId, user.id));
    return { success: true as const };
  } catch (error) {
    console.error("Error clearing search history:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Documents
// ──────────────────────────────────────────────

/** Get documents, optionally filtered by workspaceId. */
export async function getDocuments(workspaceId?: number) {
  const user = await getSessionUser();
  if (!user?.id) return [];

  try {
    const conditions = [];
    if (workspaceId !== undefined) {
      conditions.push(eq(documents.workspaceId, workspaceId));
    }
    // Scope to user's workspaces
    const userWorkspaces = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.ownerId, user.id));

    if (userWorkspaces.length === 0) return [];

    const workspaceIds = userWorkspaces.map((w) => w.id);
    conditions.push(inArray(documents.workspaceId, workspaceIds));

    return await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
}

/** Create a new document record. */
export async function createDocument(
  input: {
    workspaceId: number;
    projectId?: number;
    name: string;
    fileUrl: string;
    mimeType?: string;
  },
) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  if (!input.name || !input.fileUrl) {
    return { success: false as const, error: "Name and file URL are required" };
  }

  try {
    const [row] = await db
      .insert(documents)
      .values({
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        name: input.name.trim(),
        fileUrl: input.fileUrl,
        mimeType: input.mimeType ?? null,
      })
      .returning();

    await logAction({
      action: "document.create",
      actorId: user.id,
      targetType: "document",
      targetId: row.id,
      metadata: { name: input.name.trim(), workspaceId: input.workspaceId },
    });

    return { success: true as const, document: row };
  } catch (error) {
    console.error("Error creating document:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

/** Update document status (and optionally chunk count). */
export async function updateDocumentStatus(
  id: number,
  status: string,
  chunks?: number,
) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const values: Record<string, unknown> = { status };
    if (chunks !== undefined) {
      values.chunks = chunks;
    }
    if (status === "ready" || status === "completed") {
      values.indexedAt = sql`now()`;
    }

    await db.update(documents).set(values).where(eq(documents.id, id));

    return { success: true as const };
  } catch (error) {
    console.error("Error updating document status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

/** Delete a document by id. */
export async function deleteDocument(id: number) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const existing = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (existing.length === 0) return { success: false as const, error: "Document not found" };

    await db.delete(documents).where(eq(documents.id, id));

    await logAction({
      action: "document.delete",
      actorId: user.id,
      targetType: "document",
      targetId: id,
    });

    return { success: true as const };
  } catch (error) {
    console.error("Error deleting document:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Notification Preferences
// ──────────────────────────────────────────────

/** Get the current user's notification preferences. */
export async function getNotificationPreferences() {
  const user = await getSessionUser();
  if (!user?.id) return null;

  try {
    const rows = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return null;
  }
}

/** Upsert notification preferences for the current user. */
export async function updateNotificationPreferences(
  patch: {
    inviteEmails?: boolean;
    sharedEmails?: boolean;
    projectEmails?: boolean;
  },
) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const existing = await db
      .select({ id: notificationPreferences.id })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(notificationPreferences)
        .set(patch)
        .where(eq(notificationPreferences.userId, user.id));
    } else {
      await db.insert(notificationPreferences).values({
        userId: user.id,
        inviteEmails: patch.inviteEmails ?? true,
        sharedEmails: patch.sharedEmails ?? true,
        projectEmails: patch.projectEmails ?? true,
      });
    }

    return { success: true as const };
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Onboarding
// ──────────────────────────────────────────────

/** Get the current user's onboarding state. */
export async function getUserOnboarding() {
  const user = await getSessionUser();
  if (!user?.id) return null;

  try {
    const rows = await db
      .select({ onboardingState: users.onboardingState })
      .from(users)
      .where(eq(users.kindeId, user.id))
      .limit(1);

    return rows[0]?.onboardingState ?? null;
  } catch (error) {
    console.error("Error fetching onboarding state:", error);
    return null;
  }
}

/** Update the current user's onboarding state (partial merge). */
export async function updateUserOnboarding(
  patch: Record<string, unknown>,
) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const current = await db
      .select({ onboardingState: users.onboardingState })
      .from(users)
      .where(eq(users.kindeId, user.id))
      .limit(1);

    const merged = {
      ...(current[0]?.onboardingState as Record<string, unknown> ?? {}),
      ...patch,
    };

    await db
      .update(users)
      .set({ onboardingState: merged as Record<string, unknown> })
      .where(eq(users.kindeId, user.id));

    return { success: true as const };
  } catch (error) {
    console.error("Error updating onboarding state:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Team Member Role
// ──────────────────────────────────────────────

/**
 * Update a team member's role.
 * [SECURITY-VERIFY] — requires the caller to be a project admin.
 */
export async function updateTeamMemberRole(memberId: number, role: string) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  const validRoles = ["admin", "editor", "viewer"];
  if (!validRoles.includes(role)) {
    return { success: false as const, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` };
  }

  try {
    const member = await db
      .select({ id: teamMembers.id, projectId: teamMembers.projectId })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    if (member.length === 0) return { success: false as const, error: "Team member not found" };

    // Pro verify: caller must be project admin
    const access = await requireProjectAdminAccess(member[0].projectId);
    if (!access.allowed) {
      return { success: false as const, error: "Not authorized. Admin role required." };
    }

    await db
      .update(teamMembers)
      .set({ role })
      .where(eq(teamMembers.id, memberId));

    await logAction({
      action: "team_member.role_update",
      actorId: user.id,
      targetType: "team_member",
      targetId: memberId,
      metadata: { projectId: member[0].projectId, newRole: role },
    });

    revalidatePath("/dashboard/team");
    return { success: true as const };
  } catch (error) {
    console.error("Error updating team member role:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Accept Invite
// ──────────────────────────────────────────────

/**
 * Accept a team invitation by token.
 * If already joined, returns alreadyJoined=true with the projectId.
 */
export async function acceptInvite(token: string) {
  const user = await getSessionUser();
  if (!user?.id) {
    return { success: false as const, error: "Not authenticated" };
  }

  try {
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.inviteToken, token))
      .limit(1);

    if (members.length === 0) {
      return { success: false as const, error: "Invalid or expired invite link" };
    }

    const member = members[0];

    // If token is null, already accepted
    if (member.inviteToken === null) {
      return { success: true as const, alreadyJoined: true, projectId: member.projectId };
    }

    // Verify the current user's email matches the invited email
    const dbUser = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.kindeId, user.id))
      .limit(1);

    if (dbUser.length === 0 || dbUser[0].email !== member.email) {
      return {
        success: false as const,
        error: "This invitation was sent to a different email address. Please sign in with the email that received the invite.",
      };
    }

    // Accept: clear token, update joinedAt
    await db
      .update(teamMembers)
      .set({ inviteToken: null, joinedAt: sql`now()` })
      .where(eq(teamMembers.id, member.id));

    await logAction({
      action: "team_member.accept_invite",
      actorId: user.id,
      targetType: "team_member",
      targetId: member.id,
      metadata: { projectId: member.projectId, email: member.email },
    });

    revalidatePath("/dashboard/team");
    return { success: true as const, alreadyJoined: false, projectId: member.projectId };
  } catch (error) {
    console.error("Error accepting invite:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Resend Invite
// ──────────────────────────────────────────────

/**
 * Resend a team invitation email for a pending member.
 * Requires project admin access.
 */
export async function resendInvite(memberId: number) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const members = await db
      .select({
        id: teamMembers.id,
        email: teamMembers.email,
        inviteToken: teamMembers.inviteToken,
        projectId: teamMembers.projectId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    if (members.length === 0) return { success: false as const, error: "Member not found" };
    const member = members[0];

    // Verify admin access for the project
    const access = await requireProjectAdminAccess(member.projectId);
    if (!access.allowed) {
      return { success: false as const, error: "Not authorized. Admin role required." };
    }

    // Get project name
    const projectRows = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, member.projectId))
      .limit(1);
    const projectName = projectRows[0]?.name || "Unknown Project";

    // Get inviter name
    const dbUser = await db
      .select({ firstName: users.firstName, lastName: users.lastName, name: users.name })
      .from(users)
      .where(eq(users.kindeId, user.id))
      .limit(1);
    const inviterName = dbUser[0]?.firstName
      ? `${dbUser[0].firstName} ${dbUser[0].lastName || ""}`.trim()
      : dbUser[0]?.name || "Someone";

    // Generate new token if needed (e.g., if member was previously accepted but we're resending)
    const token = member.inviteToken || crypto.randomBytes(32).toString("hex");
    if (!member.inviteToken) {
      await db
        .update(teamMembers)
        .set({ inviteToken: token })
        .where(eq(teamMembers.id, memberId));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite?token=${token}`;

    const emailRes = await sendInviteEmail(member.email, inviterName, projectName, inviteUrl);

    return { success: true as const, emailSent: emailRes.success, emailError: emailRes.error };
  } catch (error) {
    console.error("Error resending invite:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Audit Logs (user-scoped)
// ──────────────────────────────────────────────

/**
 * Get audit logs for the current user with optional filters.
 * Extends the read in audit.ts without breaking it.
 */
export async function getAuditLogsForUser(filters?: {
  action?: string;
  targetType?: string;
  limit?: number;
}) {
  const user = await getSessionUser();
  if (!user?.id) throw new Error("Unauthorized: authentication required");

  try {
    const conditions = [eq(auditLogs.actorId, user.id)];

    if (filters?.action) {
      conditions.push(like(auditLogs.action, `%${filters.action}%`));
    }
    if (filters?.targetType) {
      conditions.push(eq(auditLogs.targetType, filters.targetType));
    }

    return await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters?.limit ?? 50);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
}

// ──────────────────────────────────────────────
// User Profile
// ──────────────────────────────────────────────

/** Update the current user's profile (first name / last name). */
export async function updateUserProfile(data: {
  firstName?: string;
  lastName?: string;
}) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  try {
    const updateData: Record<string, string | null> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName || null;
    if (data.lastName !== undefined) updateData.lastName = data.lastName || null;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.kindeId, user.id));

    return { success: true as const };
  } catch (error) {
    console.error("Error updating user profile:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Workspace Management
// ──────────────────────────────────────────────

/** Update a workspace's name. */
export async function updateWorkspace(workspaceId: number, name: string) {
  const user = await getSessionUser();
  if (!user?.id) return { success: false as const, error: "Not authenticated" };

  if (!name || name.trim() === "") {
    return { success: false as const, error: "Workspace name is required" };
  }

  try {
    const existing = await db
      .select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (existing.length === 0) return { success: false as const, error: "Workspace not found" };
    if (existing[0].ownerId !== user.id) return { success: false as const, error: "Not authorized" };

    await db
      .update(workspaces)
      .set({ name: name.trim() })
      .where(eq(workspaces.id, workspaceId));

    revalidatePath("/dashboard/settings");
    return { success: true as const };
  } catch (error) {
    console.error("Error updating workspace:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false as const, error: message };
  }
}

// ──────────────────────────────────────────────
// Ecosystem Health (aggregator)
// ──────────────────────────────────────────────

/**
 * Server-side aggregator that returns the unified ecosystem health snapshot.
 * Calls getEcosystemHealth() from api-clients (read-only — do not edit).
 */
export async function getEcosystemHealthForOverview() {
  try {
    return await getEcosystemHealth();
  } catch (error) {
    console.error("Error fetching ecosystem health:", error);
    return {
      BIMAgent: { status: "unreachable", ok: false },
      BIMCloud: { status: "unreachable", ok: false },
      BIMIndex: { status: "unreachable", ok: false },
      BIMExtract: { status: "unreachable", ok: false },
    };
  }
}
