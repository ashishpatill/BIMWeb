import { notFound } from "next/navigation";
import { getProject, getModels } from "@/lib/actions";
import { getUserRole } from "@/lib/rbac";
import { getSessionUser } from "@/lib/session";
import { db } from "@/db";
import { teamMembers, documents, users, auditLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ProjectDetailClient } from "./project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const user = await getSessionUser();

  // Load all related data in parallel
  const [models, members, projectDocs, owner, role] = await Promise.all([
    getModels(projectId),
    db.select().from(teamMembers).where(eq(teamMembers.projectId, projectId)),
    db.select().from(documents).where(eq(documents.projectId, projectId)),
    db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.kindeId, project.ownerId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    user?.id
      ? getUserRole(user.id, projectId)
      : Promise.resolve<"admin" | "editor" | "viewer" | null>(null),
  ]);

  // Get audit logs for this project
  const projectAuditLogs = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.targetType, "project"),
        eq(auditLogs.targetId, String(projectId)),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return (
    <ProjectDetailClient
      project={project}
      owner={owner}
      models={models}
      members={members}
      documents={projectDocs}
      auditLogs={projectAuditLogs}
      role={role}
    />
  );
}
