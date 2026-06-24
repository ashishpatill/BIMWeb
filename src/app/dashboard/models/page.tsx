import { getModels, getProjects } from "@/lib/actions";
import { ModelsClient } from "./models-client";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const [models, projects] = await Promise.all([
    getModels(),
    getProjects()
  ]);

  return <ModelsClient initialModels={models} projects={projects} />;
}
