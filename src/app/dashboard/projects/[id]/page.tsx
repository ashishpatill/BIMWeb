import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderGit2 } from "lucide-react";
import { getProject, getModels } from "@/lib/actions";
import { ProjectDetailClient } from "./project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) notFound();

  const project = await getProject(projectId);
  if (!project) notFound();

  const models = await getModels(projectId);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/dashboard/projects" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <FolderGit2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-sm text-zinc-400">{project.description || "No description"}</p>
        </div>
      </div>

      <ProjectDetailClient projectId={project.id} projectName={project.name} initialModels={models} />
    </div>
  );
}
