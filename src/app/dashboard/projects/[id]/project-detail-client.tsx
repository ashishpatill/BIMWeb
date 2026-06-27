"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Box,
  FileText,
  Users,
  BarChart3,
  Settings,
  Trash2,
  Share2,
  Pencil,
  ExternalLink,
  Loader2,
  Upload,
  Calendar,
  UserPlus,
  Mail,
  Clock,
  Download,
  FolderGit2,
  EyeOff,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  PageHeader,
  EmptyState,
  SegmentedTabs,
  ConfirmDialog,
  RoleBadge,
} from "@/components/common";
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
import { cn } from "@/lib/utils";
import {
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  deleteModel,
  createModel,
} from "@/lib/actions";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Project {
  id: number;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
}

interface Model {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  fileSize: string;
  fileUrl: string | null;
  status: string;
  createdAt: Date;
}

interface TeamMember {
  id: number;
  projectId: number;
  email: string;
  role: string;
  inviteToken: string | null;
  joinedAt: Date;
}

interface DocRecord {
  id: number;
  name: string;
  fileUrl: string;
  mimeType: string | null;
  status: string;
  createdAt: Date;
}

interface AuditEntry {
  id: number;
  action: string;
  actorId: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

type Role = "admin" | "editor" | "viewer";

interface ProjectDetailClientProps {
  project: Project;
  owner: { name: string | null; email: string | null } | null;
  models: Model[];
  members: TeamMember[];
  documents: DocRecord[];
  auditLogs: AuditEntry[];
  role: Role | null;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  processing: "Processing",
  failed: "Failed",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "text-emerald-400",
  processing: "text-amber-400",
  failed: "text-red-400",
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    "project.created": "Created project",
    project_shared: "Shared project",
    project_unshared: "Unshared project",
    "project.updated": "Updated project settings",
    "project.deleted": "Deleted project",
    "model.uploaded": "Uploaded a model",
    "model.deleted": "Deleted a model",
    "document.create": "Added a document",
    "team_member.added": "Added team member",
    "team_member.removed": "Removed team member",
    "team_member.role_update": "Changed team member role",
  };
  return map[action] ?? action.replace(/[._]/g, " ");
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function ProjectDetailClient({
  project,
  owner,
  models: initialModels,
  members: initialMembers,
  documents: initialDocuments,
  auditLogs: initialAuditLogs,
  role,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const isOwner = role === "admin";
  const canEdit = role === "admin" || role === "editor";
  const isViewer = role === "viewer";

  // ── Models state ──
  const [models, setModels] = useState(initialModels);

  // ── Members state ──
  const [members, setMembers] = useState(initialMembers);

  // ── Documents state ──
  const [documents] = useState(initialDocuments);

  // ── Upload Model ──
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPending, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Delete Model ──
  const [deleteModelId, setDeleteModelId] = useState<number | null>(null);
  const [deleteModelPending, startDeleteModelTransition] = useTransition();

  // ── Invite Member ──
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [invitePending, startInviteTransition] = useTransition();

  // ── Remove Member ──
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null);
  const [removeMemberPending, startRemoveMemberTransition] = useTransition();

  // ── Settings: Edit Project ──
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(
    project.description ?? "",
  );
  const [editPending, startEditTransition] = useTransition();

  // ── Settings: Delete Project ──
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  // ── Share Dialog ──
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("viewer");
  const [sharePending, startShareTransition] = useTransition();

  // ──────────────────────────────────────────────
  // Upload Model Flow
  // ──────────────────────────────────────────────

  const handleUploadModel = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!uploadFile || !uploadName.trim()) {
        toast.error("Please provide a model name and file.");
        return;
      }

      startUploadTransition(async () => {
        try {
          const formData = new FormData();
          formData.append("file", uploadFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            toast.error(err.error || "Upload failed");
            return;
          }

          const { url, fileSize } = await uploadRes.json();

          const result = await createModel(
            project.id,
            uploadName.trim(),
            undefined,
            fileSize,
            url,
          );

          if (!result.success) {
            toast.error(result.error || "Failed to create model");
            return;
          }

          toast.success("Model uploaded successfully");
          setUploadOpen(false);
          setUploadName("");
          setUploadFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (result.model) {
            setModels((prev) => [...prev, result.model as Model]);
          }
          router.refresh();
        } catch {
          toast.error("Upload failed. Please try again.");
        }
      });
    },
    [uploadFile, uploadName, project.id, router],
  );

  // ──────────────────────────────────────────────
  // Delete Model
  // ──────────────────────────────────────────────

  const handleDeleteModel = useCallback(() => {
    if (deleteModelId === null) return;
    startDeleteModelTransition(async () => {
      const result = await deleteModel(deleteModelId);
      if (!result.success) {
        toast.error(result.error || "Failed to delete model");
        return;
      }
      toast.success("Model deleted");
      setModels((prev) => prev.filter((m) => m.id !== deleteModelId));
      setDeleteModelId(null);
      router.refresh();
    });
  }, [deleteModelId, router]);

  // ──────────────────────────────────────────────
  // Invite Member
  // ──────────────────────────────────────────────

  const handleInvite = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteEmail.trim()) {
        toast.error("Please enter an email address.");
        return;
      }

      startInviteTransition(async () => {
        const result = await addTeamMember(
          project.id,
          inviteEmail.trim(),
          inviteRole,
        );
        if (!result.success) {
          toast.error(result.error || "Failed to invite member");
          return;
        }
        toast.success(`Invitation sent to ${inviteEmail.trim()}`);
        setInviteOpen(false);
        setInviteEmail("");
        setInviteRole("viewer");
        if (result.member) {
          setMembers((prev) => [...prev, result.member as TeamMember]);
        }
        router.refresh();
      });
    },
    [inviteEmail, inviteRole, project.id, router],
  );

  // ──────────────────────────────────────────────
  // Remove Member
  // ──────────────────────────────────────────────

  const handleRemoveMember = useCallback(() => {
    if (removeMemberId === null) return;
    startRemoveMemberTransition(async () => {
      const result = await removeTeamMember(removeMemberId);
      if (!result.success) {
        toast.error(result.error || "Failed to remove member");
        return;
      }
      toast.success("Team member removed");
      setMembers((prev) => prev.filter((m) => m.id !== removeMemberId));
      setRemoveMemberId(null);
      router.refresh();
    });
  }, [removeMemberId, router]);

  // ──────────────────────────────────────────────
  // Edit Project (Settings tab)
  // ──────────────────────────────────────────────

  const handleEditProject = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!editName.trim()) {
        toast.error("Project name is required");
        return;
      }

      startEditTransition(async () => {
        const result = await updateProject(
          project.id,
          editName.trim(),
          editDescription.trim() || undefined,
        );
        if (!result.success) {
          toast.error(result.error || "Failed to update project");
          return;
        }
        toast.success("Project updated");
        setEditOpen(false);
        router.refresh();
      });
    },
    [editName, editDescription, project.id, router],
  );

  // ──────────────────────────────────────────────
  // Delete Project (Settings tab)
  // ──────────────────────────────────────────────

  const handleDeleteProject = useCallback(() => {
    startDeleteTransition(async () => {
      const result = await deleteProject(project.id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete project");
        return;
      }
      toast.success("Project deleted");
      setDeleteOpen(false);
      router.push("/dashboard/projects");
    });
  }, [project.id, router]);

  // ──────────────────────────────────────────────
  // Share Project (uses addTeamMember server action)
  // ──────────────────────────────────────────────

  const handleShare = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!shareEmail.trim()) {
        toast.error("Please enter an email address.");
        return;
      }

      startShareTransition(async () => {
        const result = await addTeamMember(
          project.id,
          shareEmail.trim(),
          shareRole,
        );
        if (!result.success) {
          toast.error(result.error || "Failed to share project");
          return;
        }
        toast.success(`Project shared with ${shareEmail.trim()}`);
        setShareOpen(false);
        setShareEmail("");
        setShareRole("viewer");
        router.refresh();
      });
    },
    [shareEmail, shareRole, project.id, router],
  );

  // ──────────────────────────────────────────────
  // Tabs configuration
  // ──────────────────────────────────────────────

  const tabs = [
    {
      value: "models",
      label: "Models",
      icon: Box,
      badge: models.length,
    },
    {
      value: "documents",
      label: "Documents",
      icon: FileText,
      badge: documents.length,
    },
    {
      value: "team",
      label: "Team",
      icon: Users,
      badge: members.length,
    },
    {
      value: "insights",
      label: "Insights",
      icon: BarChart3,
    },
    {
      value: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  // ── Read the current tab from URL ──
  // We use a simple client-side search param read.
  // The SegmentedTabs component handles URL sync automatically.
  // We just need a state to decide what content to render.
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const resolvedTab = activeTab ?? "models";

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <PageHeader
        title={project.name}
        description={
          project.description ?? "No description"
        }
        breadcrumbs={[
          { label: "Projects", href: "/dashboard/projects" },
          { label: project.name },
        ]}
        icon={<FolderGit2 className="size-5" />}
        secondaryActions={
          <>
            {canEdit && (
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    aria-label="Edit project"
                  >
                    <Pencil className="size-4 mr-1.5" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit project name and description</TooltipContent>
              </Tooltip>
            )}

            {isOwner && (
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    aria-label="Delete project"
                  >
                    <Trash2 className="size-4 mr-1.5" />
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Permanently delete this project</TooltipContent>
              </Tooltip>
            )}

            {isOwner && (
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareOpen(true)}
                    aria-label="Share project"
                  >
                    <Share2 className="size-4 mr-1.5" />
                    Share
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share this project with others</TooltipContent>
              </Tooltip>
            )}
          </>
        }
      />

      {/* Project metadata */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
        <span className="flex items-center gap-1.5">
          <User className="size-3.5" />
          Owner: {owner?.name ?? owner?.email ?? "Unknown"}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          Created {formatDate(project.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" />
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
        {role && (
          <RoleBadge role={role} />
        )}
        {isViewer && (
          <span className="flex items-center gap-1 text-amber-400 text-xs">
            <EyeOff className="size-3.5" />
            Read-only
          </span>
        )}
      </div>

      {/* Segmented Tabs (URL-synced) */}
      <SegmentedTabs
        tabs={tabs}
        searchParam="tab"
        onValueChange={handleTabChange}
      />

      {/* ══════════════════════════════════════
          TAB CONTENT
          ══════════════════════════════════════ */}
      {resolvedTab === "models" && (
        <ModelsTabContent
          models={models}
          canEdit={canEdit}
          projectId={project.id}
          uploadOpen={uploadOpen}
          setUploadOpen={setUploadOpen}
          uploadName={uploadName}
          setUploadName={setUploadName}
          setUploadFile={setUploadFile}
          uploadPending={uploadPending}
          handleUploadModel={handleUploadModel}
          fileInputRef={fileInputRef}
          setDeleteModelId={setDeleteModelId}
        />
      )}

      {resolvedTab === "documents" && (
        <DocumentsTabContent documents={documents} />
      )}

      {resolvedTab === "team" && (
        <TeamTabContent
          members={members}
          canEdit={canEdit}
          inviteOpen={inviteOpen}
          setInviteOpen={setInviteOpen}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteRole={inviteRole}
          setInviteRole={setInviteRole}
          invitePending={invitePending}
          handleInvite={handleInvite}
          setRemoveMemberId={setRemoveMemberId}
        />
      )}

      {resolvedTab === "insights" && (
        <InsightsTabContent auditLogs={initialAuditLogs} />
      )}

      {resolvedTab === "settings" && (
        <SettingsTabContent
          projectName={project.name}
          projectDescription={project.description ?? ""}
          setEditOpen={setEditOpen}
          setDeleteOpen={setDeleteOpen}
          isOwner={isOwner}
        />
      )}

      {/* ────────── Dialogs ────────── */}

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription>
              Invite someone to collaborate on this project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleShare} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-email">Email address</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="colleague@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-role">Permission</Label>
              <Select
                value={shareRole}
                onValueChange={(v) => v && setShareRole(v)}
              >
                <SelectTrigger id="share-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    Viewer — read-only access
                  </SelectItem>
                  <SelectItem value="editor">
                    Editor — can upload and edit
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShareOpen(false)}
                disabled={sharePending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sharePending}>
                {sharePending && (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                )}
                Share
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project name and description.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project name</Label>
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
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editPending}>
                {editPending && (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This action cannot be undone. All models, documents, and team data associated with this project will be permanently removed.`}
        confirmLabel="Delete project"
        destructive
        loading={deletePending}
        onConfirm={handleDeleteProject}
      />

      {/* Delete Model Confirm */}
      <ConfirmDialog
        open={deleteModelId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteModelId(null);
        }}
        title="Delete Model"
        description="Are you sure you want to delete this model? This cannot be undone."
        confirmLabel="Delete model"
        destructive
        loading={deleteModelPending}
        onConfirm={handleDeleteModel}
      />

      {/* Remove Member Confirm */}
      <ConfirmDialog
        open={removeMemberId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberId(null);
        }}
        title="Remove Team Member"
        description="Are you sure you want to remove this team member? They will lose access to this project."
        confirmLabel="Remove"
        destructive
        loading={removeMemberPending}
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}

// ══════════════════════════════════════════════
// Tab Content Sub-Components
// ══════════════════════════════════════════════

// ── Models Tab ────────────────────────────────

function ModelsTabContent({
  models,
  canEdit,
  projectId,
  uploadOpen,
  setUploadOpen,
  uploadName,
  setUploadName,
  setUploadFile,
  uploadPending,
  handleUploadModel,
  fileInputRef,
  setDeleteModelId,
}: {
  models: Model[];
  canEdit: boolean;
  projectId: number;
  uploadOpen: boolean;
  setUploadOpen: (v: boolean) => void;
  uploadName: string;
  setUploadName: (v: string) => void;
  setUploadFile: (f: File | null) => void;
  uploadPending: boolean;
  handleUploadModel: (e: React.FormEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setDeleteModelId: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger>
              <Button size="sm" aria-label="Upload model">
                <Upload className="size-4 mr-1.5" />
                Upload Model
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Model</DialogTitle>
                <DialogDescription>
                  Upload a BIM model (IFC, glTF, or glB) to this project.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadModel} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model-name">Model name</Label>
                  <Input
                    id="model-name"
                    placeholder="e.g. Tower A Structure"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-file">File</Label>
                  <Input
                    id="model-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".ifc,.gltf,.glb,.obj,.fbx"
                    onChange={(e) =>
                      setUploadFile(e.target.files?.[0] ?? null)
                    }
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Supported: IFC, glTF, glB, OBJ, FBX
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadOpen(false)}
                    disabled={uploadPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploadPending}>
                    {uploadPending && (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    )}
                    Upload
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {models.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No models yet"
          description="Upload your first BIM model to this project for 3D visualization."
          primaryAction={
            canEdit
              ? { label: "Upload Model", onClick: () => setUploadOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              className="glass-panel border border-white/5 hover:border-primary/30 rounded-xl p-4 transition-all group relative"
            >
              <Link
                href={`/dashboard/projects/${projectId}/models/${model.id}`}
                className="block"
              >
                <div className="flex items-start justify-between mb-3">
                  <Box className="w-8 h-8 text-primary" />
                  <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {model.fileSize}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate mb-1">
                  {model.name}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                  {model.description || "No description"}
                </p>
              </Link>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(model.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-semibold",
                      STATUS_COLOR[model.status] ?? "text-zinc-400",
                    )}
                  >
                    {STATUS_LABEL[model.status] ?? model.status}
                  </span>

                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger>
                        <Link
                          href={`/dashboard/projects/${projectId}/models/${model.id}`}
                          aria-label="Open model in viewer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                          >
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Open in viewer</TooltipContent>
                    </Tooltip>

                    {canEdit && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setDeleteModelId(model.id)}
                            aria-label="Delete model"
                          >
                            <Trash2 className="size-3.5 text-red-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete model</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Documents Tab ─────────────────────────────

function DocumentsTabContent({
  documents,
}: {
  documents: DocRecord[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload documents to this project to make them searchable."
          primaryAction={{
            label: "Go to Documents",
            href: "/dashboard/documents",
          }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="glass-panel border border-white/5 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-xs">
                    {doc.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(doc.createdAt)}
                    {doc.mimeType && (
                      <span className="ml-2 text-zinc-600">{doc.mimeType}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    doc.status === "ready" || doc.status === "completed"
                      ? "text-emerald-400"
                      : doc.status === "failed"
                        ? "text-red-400"
                        : "text-amber-400",
                  )}
                >
                  {doc.status}
                </span>
                {doc.fileUrl && (
                  <Tooltip>
                    <TooltipTrigger>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Download document"
                      >
                        <Button variant="ghost" size="icon" className="size-7">
                          <Download className="size-3.5" />
                        </Button>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team Tab ──────────────────────────────────

function TeamTabContent({
  members,
  canEdit,
  inviteOpen,
  setInviteOpen,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  invitePending,
  handleInvite,
  setRemoveMemberId,
}: {
  members: TeamMember[];
  canEdit: boolean;
  inviteOpen: boolean;
  setInviteOpen: (v: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: string;
  setInviteRole: (v: string) => void;
  invitePending: boolean;
  handleInvite: (e: React.FormEvent) => void;
  setRemoveMemberId: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger>
              <Button size="sm" aria-label="Invite team member">
                <UserPlus className="size-4 mr-1.5" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to collaborate on this project.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => v && setInviteRole(v)}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        Viewer — read-only access
                      </SelectItem>
                      <SelectItem value="editor">
                        Editor — can upload and edit
                      </SelectItem>
                      <SelectItem value="admin">
                        Admin — full control
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteOpen(false)}
                    disabled={invitePending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={invitePending}>
                    {invitePending && (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members"
          description="Invite collaborators to work on this project together."
          primaryAction={
            canEdit
              ? {
                  label: "Invite Member",
                  onClick: () => setInviteOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="glass-panel border border-white/5 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Mail className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {member.email}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Joined {formatDate(member.joinedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge
                  role={member.role as "admin" | "editor" | "viewer"}
                />
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-400 hover:text-red-300"
                        onClick={() => setRemoveMemberId(member.id)}
                        aria-label={`Remove ${member.email}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove member</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Insights Tab ──────────────────────────────

function InsightsTabContent({
  auditLogs,
}: {
  auditLogs: AuditEntry[];
}) {
  if (auditLogs.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No activity yet"
        description="Actions performed on this project will appear here as a timeline."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative pl-8 space-y-0">
        {auditLogs.map((entry, index) => (
          <div key={entry.id} className="relative pb-6">
            {index < auditLogs.length - 1 && (
              <div className="absolute left-0 top-3 bottom-0 w-px bg-white/10" />
            )}
            <div className="absolute left-[-7px] top-1.5 size-3.5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
              <div className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-white">
                {formatAuditAction(entry.action)}
              </p>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                <Clock className="size-3" />
                {formatDate(entry.createdAt)}{" "}
                {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <p className="text-xs text-zinc-600 mt-0.5 font-mono">
                  {JSON.stringify(entry.metadata).slice(0, 120)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────

function SettingsTabContent({
  projectName,
  projectDescription,
  setEditOpen,
  setDeleteOpen,
  isOwner,
}: {
  projectName: string;
  projectDescription: string;
  setEditOpen: (v: boolean) => void;
  setDeleteOpen: (v: boolean) => void;
  isOwner: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* General Settings */}
      <div className="glass-panel border border-white/5 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">General</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Manage your project name and description.
        </p>

        <div className="space-y-4 max-w-lg">
          <div>
            <Label className="text-sm text-zinc-300">Project name</Label>
            <p className="text-white text-base mt-1">{projectName}</p>
          </div>
          <div>
            <Label className="text-sm text-zinc-300">Description</Label>
            <p className="text-zinc-400 text-sm mt-1">
              {projectDescription || (
                <span className="italic text-zinc-600">No description</span>
              )}
            </p>
          </div>

          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              aria-label="Edit project settings"
            >
              <Pencil className="size-4 mr-1.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Sharing */}
      <div className="glass-panel border border-white/5 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-1">Sharing</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Share this project with others via the Share button in the header or
          the Team tab.
        </p>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="glass-panel border border-red-500/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-400 mb-1">Danger Zone</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Irreversible actions. Proceed with caution.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete project permanently"
          >
            <Trash2 className="size-4 mr-1.5" />
            Delete Project
          </Button>
        </div>
      )}
    </div>
  );
}
