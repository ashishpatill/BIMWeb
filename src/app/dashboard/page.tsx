import { getProjects, getModels, getTeamMembers } from "@/lib/actions";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [projects, models, team] = await Promise.all([
    getProjects(),
    getModels(),
    getTeamMembers()
  ]);

  return (
    <DashboardClient
      projectCount={projects.length}
      modelCount={models.length}
      teamCount={team.length}
    />
  );
}
