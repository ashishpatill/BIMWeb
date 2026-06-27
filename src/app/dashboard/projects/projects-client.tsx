"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FolderGit2,
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Copy,
  Share2,
  Trash2,
  LayoutGrid,
  Table2,
  ArrowUpDown,
  Calendar,
  Users,
  CuboidIcon,
  Loader2,
  FolderOpen,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader, EmptyState, ConfirmDialog } from "@/components/common";
import {
  createProject,
  deleteProject as deleteProjectAction,
  updateProject,
} from "@/lib/actions";

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

interface ProjectsClientProps {
  initialProjects: ProjectWithDetails[];
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const router = useRouter();

  // Search & sort & view
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "table">("grid");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPending, startCreateTransition] = useTransition();

  // Edit dialog
  const [editTarget, setEditTarget] = useState<ProjectWithDetails | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPending, startEditTransition] = useTransition();

  // Delete confirm
  const [deleteTarget, setDeleteTarget] =
    useState<ProjectWithDetails | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  // Filter & sort
  const filteredProjects = useMemo(() => {
    const result = initialProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(search.toLowerCase()),
    );

    switch (sort) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "models":
        result.sort((a, b) => b.modelCount - a.modelCount);
        break;
      case "recent":
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );
        break;
    }

    return result;
  }, [initialProjects, search, sort]);

  const hasProjects = initialProjects.length > 0;

  // Handlers
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!createName.trim()) return;
      startCreateTransition(async () => {
        const res = await createProject(createName, createDescription);
        if (res.success) {
          toast.success("Project created successfully");
          setCreateOpen(false);
          setCreateName("");
          setCreateDescription("");
          router.refresh();
        } else {
          toast.error(res.error ?? "Failed to create project");
        }
      });
    },
    [createName, createDescription, router],
  );

  const handleEdit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editTarget || !editName.trim()) return;
      startEditTransition(async () => {
        const res = await updateProject(editTarget.id, editName, editDescription);
        if (res.success) {
          toast.success("Project updated successfully");
          setEditTarget(null);
          router.refresh();
        } else {
          toast.error(res.error ?? "Failed to update project");
        }
      });
    },
    [editTarget, editName, editDescription, router],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const res = await deleteProjectAction(deleteTarget.id);
      if (res.success) {
        toast.success("Project deleted permanently");
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to delete project");
      }
    });
  }, [deleteTarget, router]);

  const handleDuplicate = useCallback(
    async (project: ProjectWithDetails) => {
      const res = await createProject(
        `${project.name} (Copy)`,
        project.description ?? undefined,
      );
      if (res.success) {
        toast.success("Project duplicated");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to duplicate project");
      }
    },
    [router],
  );

  const handleShare = useCallback(() => {
    toast.info("Share this project from the project detail page");
  }, []);

  const openEdit = useCallback((project: ProjectWithDetails) => {
    setEditTarget(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  }, []);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <PageHeader
        title="Projects"
        description="Manage and coordinate your Building Information Models."
        breadcrumbs={[{ label: "Projects" }]}
        primaryAction={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button className="gap-2"><Plus className="size-4" />New project</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FolderGit2 className="size-5 text-primary" />
                  Create New Project
                </DialogTitle>
                <DialogDescription>
                  Create a container for your BIM models, documentation, and
                  team collaborators.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Project Name</Label>
                  <Input
                    id="create-name"
                    placeholder="e.g. Skyline Residency"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-description">Description</Label>
                  <Textarea
                    id="create-description"
                    placeholder="Describe project details, building phases, or requirements..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    disabled={createPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPending || !createName.trim()}
                  >
                    {createPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={sort}
            onValueChange={(value) => {
              if (value) setSort(value);
            }}
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <SelectTrigger aria-label="Sort projects" className="w-[140px]">
                    <ArrowUpDown className="size-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                }
              />
              <TooltipContent>Sort order</TooltipContent>
            </Tooltip>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="models">Models count</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border border-input p-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={view === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setView("grid")}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>Grid view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={view === "table" ? "secondary" : "ghost"}
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => setView("table")}
                    aria-label="Table view"
                  >
                    <Table2 className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>Table view</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Content: empty states or cards/table */}
      {!hasProjects && !search ? (
        <EmptyState
          icon={FolderGit2}
          title="Create your first project"
          description="Get started by creating a project to organize your BIM models and collaborate with your team."
          primaryAction={{
            label: "Create project",
            onClick: () => setCreateOpen(true),
          }}
        />
      ) : filteredProjects.length === 0 && search ? (
        <EmptyState
          icon={FolderOpen}
          title={`No projects match "${search}"`}
          description="Try adjusting your search query or create a new project."
          primaryAction={{
            label: "Clear search",
            onClick: () => setSearch(""),
          }}
        />
      ) : view === "grid" ? (
        /* ── Grid view ── */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <ProjectGridCard
                  project={project}
                  onEdit={() => openEdit(project)}
                  onDelete={() => setDeleteTarget(project)}
                  onDuplicate={() => handleDuplicate(project)}
                  onShare={handleShare}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* ── Table view ── */
        <div className="overflow-x-auto rounded-xl border border-input">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-input bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Models
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Members
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Owner
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    project={project}
                    onEdit={() => openEdit(project)}
                    onDelete={() => setDeleteTarget(project)}
                    onDuplicate={() => handleDuplicate(project)}
                    onShare={handleShare}
                  />
                ))}
              </AnimatePresence>
              {filteredProjects.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No projects to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit Project
            </DialogTitle>
            <DialogDescription>
              Update the project name or description.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={editPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editPending || !editName.trim()}
              >
                {editPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Project"
        description={`This permanently removes "${deleteTarget?.name ?? ""}" and all its models, documents, and team members. This action cannot be undone.`}
        confirmLabel="Delete Project"
        onConfirm={handleDeleteConfirm}
        destructive
        loading={deletePending}
      />
    </div>
  );
}

/* ── Grid Card ── */

interface ProjectCardActions {
  project: ProjectWithDetails;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}

function ProjectGridCard({
  project,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
}: ProjectCardActions) {
  const router = useRouter();

  return (
    <Card className="group relative flex flex-col overflow-hidden border border-border/60 transition-all duration-200 hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5">
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="flex flex-1 flex-col"
      >
        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          {/* Top row: icon + date */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderGit2 className="size-5 text-primary" />
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Name */}
          <h3 className="line-clamp-1 text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
            {project.name}
          </h3>

          {/* Description */}
          {project.description ? (
            <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : (
            <p className="flex-1 text-sm italic text-muted-foreground/50">
              No description
            </p>
          )}

          {/* Stats row */}
          <div className="mt-auto flex items-center gap-4 border-t border-border/40 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CuboidIcon className="size-3.5" />
              <span>
                {project.modelCount}{" "}
                {project.modelCount === 1 ? "model" : "models"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              <span>
                {project.memberCount}{" "}
                {project.memberCount === 1 ? "member" : "members"}
              </span>
            </div>
          </div>

          {/* Owner */}
          <div className="text-xs text-muted-foreground">
            Owned by{" "}
            <span className="font-medium text-foreground">
              {project.ownerName}
            </span>
          </div>
        </CardContent>
      </Link>

      {/* ⋯ Menu */}
      <div className="absolute right-2 top-2 z-10">
        <DropdownMenu>
          <Tooltip>
            <DropdownMenuTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Project actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>Actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/projects/${project.id}`);
              }}
            >
              <ExternalLink className="size-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Share2 className="size-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

/* ── Table Row ── */

function TableRow({
  project,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
}: ProjectCardActions) {
  const router = useRouter();

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="group border-b border-input transition-colors hover:bg-muted/30"
    >
      <td className="px-4 py-3">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
        >
          <FolderGit2 className="size-4 shrink-0 text-primary" />
          <span className="max-w-[200px] truncate">{project.name}</span>
        </Link>
        {project.description && (
          <p className="mt-0.5 max-w-[300px] line-clamp-1 text-xs text-muted-foreground">
            {project.description}
          </p>
        )}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
        {project.modelCount}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
        {project.memberCount}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
        {project.ownerName}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
        {new Date(project.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <Tooltip>
            <DropdownMenuTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0"
                      aria-label="Project actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>Actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                router.push(`/dashboard/projects/${project.id}`)
              }
            >
              <ExternalLink className="size-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="size-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}
