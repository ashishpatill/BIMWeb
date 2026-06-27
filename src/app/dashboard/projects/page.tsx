import { getProjects, getDbUser, getModels, getTeamMembers } from "@/lib/actions";
import { ProjectsClient } from "./projects-client";

export const dynamic = "force-dynamic";

export interface ProjectWithDetails {
  id: number;
  name: string;
  description: string | null;
  ownerId: string;
  workspaceId: number | null;
  createdAt: Date;
  modelCount: number;
  memberCount: number;
  ownerName: string;
}

export default async function ProjectsPage() {
  const [projects, dbUser, models, teamMembers] = await Promise.all([
    getProjects(),
    getDbUser(),
    getModels(),
    getTeamMembers(),
  ]);

  const modelCountMap: Record<number, number> = {};
  for (const model of models) {
    modelCountMap[model.projectId] = (modelCountMap[model.projectId] || 0) + 1;
  }

  const memberCountMap: Record<number, number> = {};
  for (const member of teamMembers) {
    memberCountMap[member.projectId] = (memberCountMap[member.projectId] || 0) + 1;
  }

  const ownerName = dbUser?.firstName
    ? `${dbUser.firstName}${dbUser.lastName ? ` ${dbUser.lastName}` : ""}`
    : dbUser?.name || "You";

  const projectsWithDetails: ProjectWithDetails[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    ownerId: p.ownerId,
    workspaceId: p.workspaceId,
    createdAt: p.createdAt,
    modelCount: modelCountMap[p.id] ?? 0,
    memberCount: memberCountMap[p.id] ?? 0,
    ownerName,
  }));

  return <ProjectsClient initialProjects={projectsWithDetails} />;
}
