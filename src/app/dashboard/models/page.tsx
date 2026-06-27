import { getModels, getProjects } from "@/lib/actions";
import { ModelsClient } from "./models-client";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const [models, projects] = await Promise.all([
    getModels(),
    getProjects(),
  ]);

  const projectMap: Record<number, string> = {};
  for (const project of projects) {
    projectMap[project.id] = project.name;
  }

  return (
    <ModelsClient
      initialModels={models}
      projectMap={projectMap}
      projects={projects}
    />
  );
}
