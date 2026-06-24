import { getTeamMembers, getProjects } from "@/lib/actions";
import { TeamClient } from "./team-client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, projects] = await Promise.all([
    getTeamMembers(),
    getProjects()
  ]);

  return <TeamClient initialMembers={members} projects={projects} />;
}
