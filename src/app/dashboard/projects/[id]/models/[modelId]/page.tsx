import { notFound } from "next/navigation";
import { getProject } from "@/lib/actions";
import { getModelById } from "./get-model";
import { ViewerClient } from "./viewer-client";

interface PageProps {
  params: Promise<{
    id: string;
    modelId: string;
  }>;
}

export default async function ModelViewerPage({ params }: PageProps) {
  const { id, modelId } = await params;

  const projectId = Number(id);
  const modelIdNum = Number(modelId);

  if (isNaN(projectId) || isNaN(modelIdNum)) {
    notFound();
  }

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const model = await getModelById(modelIdNum, projectId);
  if (!model) {
    notFound();
  }

  const fileType = model.fileUrl
    ? (model.fileUrl.match(/\.(gltf|glb|ifc|obj|fbx)(\?|$)/i)?.[1]?.toLowerCase() as
        | "gltf"
        | "glb"
        | "ifc"
        | "obj"
        | "fbx"
        | undefined) || "unknown"
    : "unknown";

  return (
    <ViewerClient
      projectId={projectId}
      projectName={project.name}
      modelId={modelIdNum}
      modelName={model.name}
      modelUrl={model.fileUrl || null}
      fileType={fileType}
    />
  );
}
