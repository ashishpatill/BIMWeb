import { getSessionUser } from "@/lib/session";
import {
  getProjects,
  getModels,
  getTeamMembers,
  getDocuments,
  getAuditLogsForUser,
  getEcosystemHealthForOverview,
  getUserOnboarding,
} from "@/lib/actions";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";
import type { RecentProject, ActivityItem, EcosystemHealthMap } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const kindeUser = await getSessionUser();

  const [allProjects, models, team, documents, auditLogs, ecosystemHealth, onboarding] =
    await Promise.all([
      getProjects(),
      getModels(),
      getTeamMembers(),
      getDocuments(),
      getAuditLogsForUser({ limit: 10 }).catch(() => []),
      getEcosystemHealthForOverview(),
      getUserOnboarding(),
    ]);

  // Get the user's first workspace name
  let workspaceName = "My Workspace";
  if (kindeUser?.id) {
    try {
      const userWorkspaces = await db
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(eq(workspaces.ownerId, kindeUser.id))
        .limit(1);
      if (userWorkspaces.length > 0) {
        workspaceName = userWorkspaces[0].name;
      }
    } catch {
      // fallback to default
    }
  }

  // Compute model count per project for recent project cards
  const projectModelMap = new Map<number, number>();
  for (const model of models) {
    projectModelMap.set(model.projectId, (projectModelMap.get(model.projectId) ?? 0) + 1);
  }

  const recentProjects: RecentProject[] = allProjects.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    modelCount: projectModelMap.get(p.id) ?? 0,
  }));

  const activityItems: ActivityItem[] = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    actorId: log.actorId,
    metadata: log.metadata as Record<string, unknown> | null,
    createdAt: log.createdAt?.toISOString() ?? new Date().toISOString(),
  }));

  const health = ecosystemHealth as unknown as EcosystemHealthMap;

  return (
    <DashboardClient
      userFirstName={kindeUser?.given_name ?? null}
      workspaceName={workspaceName}
      projectCount={allProjects.length}
      modelCount={models.length}
      teamCount={team.length}
      documentCount={documents.length}
      totalProjectsCount={allProjects.length}
      recentProjects={recentProjects}
      recentActivity={activityItems}
      ecosystemHealth={health}
      onboarding={onboarding as Record<string, unknown> | null}
    />
  );
}
