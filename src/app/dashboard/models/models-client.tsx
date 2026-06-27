"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  UploadCloud,
  Trash2,
  Loader2,
  FolderKanban,
  AlertCircle,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState, ConfirmDialog } from "@/components/common";
import { createModel, deleteModel } from "@/lib/actions";

interface ModelItem {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  workspaceId: number | null;
  fileSize: string;
  fileUrl: string | null;
  status: string;
  createdAt: Date;
}

interface Project {
  id: number;
  name: string;
}

interface ModelsClientProps {
  initialModels: ModelItem[];
  projectMap: Record<number, string>;
  projects: Project[];
}

type SortKey = "recent" | "name" | "size";

function parseFileSizeValue(size: string): number {
  const match = size.match(/^([\d.]+)\s*(KB|MB|GB)?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2] ?? "MB";
  if (unit === "GB") return num * 1024;
  if (unit === "KB") return num / 1024;
  return num;
}

function formatStatus(
  status: string,
): { label: string; className: string } {
  switch (status) {
    case "completed":
    case "ready":
      return { label: "Ready", className: "text-emerald-400" };
    case "processing":
    case "pending":
      return { label: "Processing", className: "text-amber-400" };
    case "error":
    case "failed":
      return { label: "Error", className: "text-red-400" };
    default:
      return { label: "\u2014", className: "text-zinc-500" };
  }
}

export function ModelsClient({
  initialModels,
  projectMap,
  projects,
}: ModelsClientProps) {
  const router = useRouter();

  // ── Filters & sort ─────────────────────────────────────
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  // ── Upload dialog ──────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  const [modelDesc, setModelDesc] = useState("");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Delete ─────────────────────────────────────────────
  const [deleteModelId, setDeleteModelId] = useState<number | null>(null);
  const [deleteIsPending, setDeleteIsPending] = useState(false);

  // ── Computed filtered + sorted models ──────────────────
  const filteredModels = useMemo(() => {
    let result = [...initialModels];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)),
      );
    }

    if (projectFilter !== "all") {
      result = result.filter(
        (m) => m.projectId === Number(projectFilter),
      );
    }

    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "size":
        result.sort(
          (a, b) =>
            parseFileSizeValue(b.fileSize) -
            parseFileSizeValue(a.fileSize),
        );
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
  }, [initialModels, search, projectFilter, sortBy]);

  const selectedModelForDelete = deleteModelId
    ? initialModels.find((m) => m.id === deleteModelId)
    : null;

  // ── Handlers ───────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const nameWithoutExt = selectedFile.name.replace(/\.[^.]+$/, "");
      setModelName(nameWithoutExt);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName || !uploadProjectId || !file) {
      setUploadError("Please fill in all required fields.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      const uploadResult = await new Promise<{
        url: string;
        fileSize: string;
        name: string;
      }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const pct =
              Math.round((event.loaded / event.total) * 80) + 10;
            setUploadProgress(Math.min(pct, 90));
          }
        });

        xhr.open("POST", "/api/upload");
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Invalid server response"));
            }
          } else {
            let errMsg = "Upload failed";
            try {
              const err = JSON.parse(xhr.responseText);
              errMsg = err.error || errMsg;
            } catch {
              /* ignore parse error */
            }
            reject(new Error(errMsg));
          }
        };
        xhr.onerror = () =>
          reject(
            new Error("Network error \u2014 upload could not complete"),
          );
        xhr.send(formData);
      });

      setUploadProgress(95);

      const res = await createModel(
        Number(uploadProjectId),
        uploadResult.name,
        modelDesc || undefined,
        uploadResult.fileSize,
        uploadResult.url,
      );

      setIsUploading(false);
      setUploadProgress(0);

      if (res.success) {
        setUploadOpen(false);
        setModelName("");
        setModelDesc("");
        setUploadProjectId("");
        setFile(null);
        setUploadError(null);
        toast.success("Model uploaded successfully");
        router.refresh();
      } else {
        const errorMsg = res.error || "Failed to save model";
        setUploadError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      toast.error(msg);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteModel = async () => {
    if (deleteModelId === null) return;
    setDeleteIsPending(true);
    try {
      const res = await deleteModel(deleteModelId);
      if (res.success) {
        toast.success("Model deleted");
        setDeleteModelId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete model");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete model",
      );
    } finally {
      setDeleteIsPending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Models"
        description="Browse and manage all BIM models across your projects."
        breadcrumbs={[{ label: "Models" }]}
        primaryAction={
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2"
          >
            <UploadCloud className="size-4" />
            Upload model
          </Button>
        }
      />

      {/* ── Filters ───────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={projectFilter}
            onValueChange={(val) => {
              if (val !== null) setProjectFilter(val);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortKey)}
          >
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="mr-2 size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Model grid ─────────────────────────────── */}
      {filteredModels.length === 0 ? (
        <EmptyState
          icon={Box}
          title={
            search || projectFilter !== "all"
              ? "No models found"
              : "No models yet"
          }
          description={
            search || projectFilter !== "all"
              ? "Try a different search or clear your filters."
              : "Upload your first BIM model to get started."
          }
          primaryAction={
            search || projectFilter !== "all"
              ? undefined
              : {
                  label: "Upload model",
                  onClick: () => setUploadOpen(true),
                }
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => {
            const statusInfo = formatStatus(model.status);
            return (
              <Card
                key={model.id}
                onClick={() =>
                  router.push(
                    `/dashboard/projects/${model.projectId}/models/${model.id}`,
                  )
                }
                className="glass-panel cursor-pointer border border-white/5 bg-white/5 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(
                      `/dashboard/projects/${model.projectId}/models/${model.id}`,
                    );
                  }
                }}
              >
                <CardContent className="p-5">
                  {/* Header row */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Box className="size-4 shrink-0 text-primary" />
                      <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-primary">
                        {model.name}
                      </h3>
                    </div>
                    <Tooltip>
                      <TooltipTrigger
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setDeleteModelId(model.id);
                        }}
                        aria-label="Delete model"
                        className="shrink-0 text-red-400/60 transition-colors hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Delete model
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Description */}
                  <p className="mb-3 line-clamp-2 min-h-[2rem] text-xs text-zinc-400">
                    {model.description || (
                      <span className="italic text-zinc-600">
                        No description
                      </span>
                    )}
                  </p>

                  {/* Project */}
                  <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                    <FolderKanban className="size-3" />
                    <span className="truncate">
                      {projectMap[model.projectId] ??
                        `Project #${model.projectId}`}
                    </span>
                  </div>

                  {/* Size + Status */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-500">
                      {model.fileSize}
                    </span>
                    <span className={statusInfo.className}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="mt-1 text-[10px] text-zinc-600">
                    {new Date(model.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Upload dialog ──────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload model</DialogTitle>
            <DialogDescription>
              Upload a BIM model to one of your projects. Supported
              formats: glTF, GLB, IFC.
            </DialogDescription>
          </DialogHeader>

          {projects.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <AlertCircle className="size-5 shrink-0 text-amber-400" />
              <div className="text-sm">
                <p className="font-medium text-amber-300">
                  No projects available
                </p>
                <p className="mt-1 text-zinc-400">
                  You need to create a project before uploading models.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadOpen(false);
                      router.push("/dashboard/projects");
                    }}
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Create a project
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Project select */}
              <div className="space-y-2">
                <Label htmlFor="upload-project">Project *</Label>
                <Select
                  value={uploadProjectId}
                  onValueChange={(val) => {
                    if (val !== null) setUploadProjectId(val);
                  }}
                  required
                >
                  <SelectTrigger id="upload-project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File drop */}
              <div className="space-y-2">
                <Label>File *</Label>
                <div className="relative flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center transition-colors hover:border-primary/40">
                  <input
                    type="file"
                    accept=".gltf,.glb,.ifc"
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    required
                  />
                  <UploadCloud className="mb-2 size-8 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-300">
                    {file
                      ? file.name
                      : "Click or drag a file here"}
                  </span>
                  <span className="mt-1 text-xs text-zinc-500">
                    glTF, GLB, or IFC up to 100 MB
                  </span>
                </div>
              </div>

              {/* Model name */}
              <div className="space-y-2">
                <Label htmlFor="upload-name">Name *</Label>
                <Input
                  id="upload-name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="Model name"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="upload-desc">
                  Description (optional)
                </Label>
                <Textarea
                  id="upload-desc"
                  value={modelDesc}
                  onChange={(e) => setModelDesc(e.target.value)}
                  placeholder="Add notes about this model..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Progress bar */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {uploadError && (
                <p className="text-sm text-red-400">{uploadError}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isUploading ||
                    !modelName ||
                    !uploadProjectId ||
                    !file
                  }
                >
                  {isUploading && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Upload
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ────────────────────── */}
      <ConfirmDialog
        open={deleteModelId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteModelId(null);
        }}
        title="Delete model"
        description={
          selectedModelForDelete
            ? `Are you sure you want to delete "${selectedModelForDelete.name}"? This action cannot be undone.`
            : "Are you sure you want to delete this model? This action cannot be undone."
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteModel}
        destructive
        loading={deleteIsPending}
      />
    </div>
  );
}
