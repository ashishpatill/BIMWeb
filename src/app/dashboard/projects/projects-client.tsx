"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FolderGit2, Plus, Search, Calendar, ChevronRight, Loader2, Trash2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProject, deleteProject, updateProject } from "@/lib/actions";

interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
}

interface ProjectsClientProps {
  initialProjects: Project[];
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPending, startEditTransition] = useTransition();

  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [deleteIsPending, startDeleteTransition] = useTransition();

  const filteredProjects = initialProjects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createProject(name, description);
      if (res.success) {
        setIsOpen(false);
        setName("");
        setDescription("");
        router.refresh();
      } else {
        setError(res.error || "Something went wrong");
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject || !editName.trim()) return;
    startEditTransition(async () => {
      const res = await updateProject(editProject.id, editName, editDescription);
      if (res.success) {
        setEditProject(null);
        router.refresh();
      }
    });
  };

  const handleDelete = async (projectId: number) => {
    startDeleteTransition(async () => {
      const res = await deleteProject(projectId);
      if (res.success) {
        setDeleteProjectId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Projects</h1>
          <p className="text-zinc-400">Manage and coordinate your Building Information Models.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto px-6 py-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-95" />}>
            <Plus className="w-5 h-5" />
            New Project
          </DialogTrigger>
          <DialogContent className="glass-panel border border-white/10 bg-zinc-950/95 text-white max-w-md rounded-2xl p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <FolderGit2 className="text-primary w-6 h-6" /> Create New Project
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Create a container for your BIM models, documentation, and team collaborators.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-zinc-300">Project Name</Label>
                <Input id="name" placeholder="e.g. Skyline Residency" value={name} onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-zinc-300">Description</Label>
                <Textarea id="description" placeholder="Describe project details, building phases, or requirements..."
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 min-h-[100px]" />
              </div>
              {error && <p className="text-sm font-semibold text-red-400 mt-2">{error}</p>}
              <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">Cancel</Button>
                <Button type="submit" disabled={isPending || !name.trim()}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2">
                  {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-11 bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-full" />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-10 h-72 flex flex-col items-center justify-center text-center gap-4 border border-white/5 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <FolderGit2 className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-1">No Projects Found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              {search ? "No projects match your search query." : "Create your first project to get started with BIMWeb."}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProjects.map((project, index) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, delay: index * 0.05 }}>
                <Card className="glass-panel overflow-hidden relative group hover:border-primary/30 transition-colors duration-300 rounded-2xl border border-white/5 flex flex-col justify-between h-56">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <FolderGit2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); setEditProject(project); setEditName(project.name); setEditDescription(project.description || ""); }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            title="Edit project">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteProjectId(project.id); }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete project">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white tracking-tight mb-2 truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm font-medium text-zinc-400 line-clamp-2">
                        {project.description || "No description provided."}
                      </p>
                    </div>

                    <Link href={`/dashboard/projects/${project.id}`} className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                      <span>View details</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editProject !== null} onOpenChange={(open) => { if (!open) setEditProject(null); }}>
        <DialogContent className="glass-panel border border-white/10 bg-zinc-950/95 text-white max-w-md rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Pencil className="text-primary w-5 h-5" /> Edit Project
            </DialogTitle>
            <DialogDescription className="text-zinc-400">Update the project name or description.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-semibold text-zinc-300">Project Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-semibold text-zinc-300">Description</Label>
              <Textarea id="edit-description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 min-h-[100px]" />
            </div>
            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditProject(null)}
                className="w-full sm:w-auto rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">Cancel</Button>
              <Button type="submit" disabled={editIsPending || !editName.trim()}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                {editIsPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteProjectId !== null} onOpenChange={(open) => { if (!open) setDeleteProjectId(null); }}>
        <DialogContent className="glass-panel border border-white/10 bg-zinc-950/95 text-white max-w-sm rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" /> Delete Project
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete this project? This will permanently remove all models, team members, and associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteProjectId(null)}
              className="w-full sm:w-auto rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={() => deleteProjectId && handleDelete(deleteProjectId)} disabled={deleteIsPending}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl">
              {deleteIsPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
