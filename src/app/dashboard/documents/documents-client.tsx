"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  Loader2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CircleCheck,
  FileWarning,
  Eye,
  ImageIcon,
  FileType,
  Files,
} from "lucide-react";
import {
  PageHeader,
  EmptyState,
  ConfirmDialog,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  createDocument,
  updateDocumentStatus,
  deleteDocument,
} from "@/lib/actions";
import { bimExtract, bimIndex } from "@/lib/api-clients";

// ─── Types ─────────────────────────────────────────────────────

interface DocumentRecord {
  id: number;
  workspaceId: number;
  projectId: number | null;
  name: string;
  fileUrl: string;
  mimeType: string | null;
  status: string;
  chunks: number | null;
  indexedAt: Date | null;
  createdAt: Date | null;
}

export interface DocumentsClientProps {
  initialDocuments: DocumentRecord[];
  ecosystemHealth: Record<string, { status: string; ok: boolean }>;
  workspaceId: number | null;
}

// ─── Status helpers ─────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string }
> = {
  pending: {
    label: "Queued",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  parsing: {
    label: "Parsing",
    dot: "bg-blue-500",
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  indexing: {
    label: "Indexing",
    dot: "bg-violet-500",
    bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  ready: {
    label: "Ready",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  completed: {
    label: "Ready",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-500",
    bg: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  error: {
    label: "Failed",
    dot: "bg-red-500",
    bg: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    dot: "bg-zinc-500",
    bg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  };
}

async function finalizePipelineIndex(
  finalStatus: Record<string, unknown>,
  docLabel: string,
): Promise<number | undefined> {
  const indexed =
    typeof finalStatus.indexed === "number" ? finalStatus.indexed : 0;
  const chunkCount =
    typeof finalStatus.chunk_count === "number"
      ? finalStatus.chunk_count
      : typeof finalStatus.chunks === "number"
        ? finalStatus.chunks
        : undefined;

  if (indexed > 0) {
    return chunkCount ?? indexed;
  }

  const rawChunks = finalStatus.chunks;
  if (!Array.isArray(rawChunks) || rawChunks.length === 0) {
    return chunkCount;
  }

  const documents = rawChunks
    .map((chunk, i) => {
      const c = chunk as Record<string, unknown>;
      const body = String(c.content ?? c.text ?? c.original_content ?? "").trim();
      if (!body) return null;
      return {
        title: String(c.title ?? `${docLabel}-${i + 1}`),
        body,
      };
    })
    .filter((d): d is { title: string; body: string } => d !== null);

  if (documents.length === 0) {
    return chunkCount;
  }

  try {
    const result = await bimIndex.ingest(documents);
    return result.indexed ?? documents.length;
  } catch {
    return chunkCount ?? documents.length;
  }
}

function getMimeIcon(mimeType: string | null) {
  if (!mimeType) return <FileText className="size-4 shrink-0" />;
  if (mimeType.startsWith("image/"))
    return <ImageIcon className="size-4 shrink-0" />;
  if (mimeType === "text/plain")
    return <FileType className="size-4 shrink-0" />;
  if (mimeType === "application/pdf")
    return <FileWarning className="size-4 shrink-0" />;
  return <FileText className="size-4 shrink-0" />;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Pipeline status: human-readable stage ─────────────────────

const PIPELINE_STAGES = ["pending", "parsing", "indexing", "ready"];
const TERMINAL_FAILURE = ["failed", "error"];

function getStageIndex(status: string): number {
  const idx = PIPELINE_STAGES.indexOf(status);
  return idx >= 0 ? idx : -1;
}

function isTerminal(status: string): boolean {
  return status === "ready" || status === "completed" || TERMINAL_FAILURE.includes(status);
}

// ─── Component ─────────────────────────────────────────────────

export function DocumentsClient({
  initialDocuments,
  ecosystemHealth,
  workspaceId,
}: DocumentsClientProps) {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [refreshPending, startRefreshTransition] = useTransition();

  // Delete dialog
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Status check helpers ──
  const bimExtractHealthy =
    ecosystemHealth.BIMExtract?.ok ?? false;
  const bimIndexHealthy =
    ecosystemHealth.BIMIndex?.ok ?? false;
  const someBackendOffline = !bimExtractHealthy || !bimIndexHealthy;

  // ── Handle upload ──
  const handleUpload = useCallback(
    async (file: File) => {
      if (!workspaceId) {
        toast.error("No workspace found. Create a workspace first.");
        return;
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "text/plain",
      ];
      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowedExts = ["pdf", "png", "jpg", "jpeg", "txt"];
      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext ?? "")) {
        toast.error(
          "Unsupported file type. Accepted: PDF, PNG, JPG, JPEG, TXT."
        );
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      setUploadFileName(file.name);

      try {
        // Step 1: Upload via XHR with progress
        const uploadResult = await new Promise<{
          url: string;
          fileSize: string;
          name: string;
        }>((resolve, reject) => {
          const formData = new FormData();
          formData.append("file", file);

          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 90);
              setUploadProgress(pct);
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error("Invalid upload response"));
              }
            } else {
              let errMsg = "Upload failed";
              try {
                const resp = JSON.parse(xhr.responseText);
                errMsg = resp.error ?? errMsg;
              } catch {
                // ignore parse error
              }
              reject(new Error(errMsg));
            }
          });
          xhr.addEventListener("error", () => {
            reject(new Error("Network error — upload could not complete"));
          });
          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });
          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });

        setUploadProgress(95);

        // Step 2: Create document record
        const mimeType = file.type || undefined;
        const docResult = await createDocument({
          workspaceId,
          name: uploadResult.name,
          fileUrl: uploadResult.url,
          mimeType,
        });

        if (!docResult.success || !docResult.document) {
          throw new Error(docResult.error || "Failed to create document record");
        }

        const doc = docResult.document;
        setUploadProgress(100);

        // Step 3: Start BIMExtract pipeline
        setDocuments((prev) => [doc, ...prev]);
        toast.success("Document uploaded. Starting ingestion pipeline...");

        try {
          const pipeline = await bimExtract.startPipeline("ingest", {
            doc_path: doc.fileUrl,
            text_content: "",
          });

          // Update status to "parsing"
          await updateDocumentStatus(doc.id, "parsing");
          setDocuments((prev) =>
            prev.map((d) => (d.id === doc.id ? { ...d, status: "parsing" } : d))
          );

          // Step 4: Poll for completion
          const finalStatus = await bimExtract.pollPipeline("ingest", pipeline.job_id, {
            interval: 2000,
            timeout: 120000,
          });

          const pipelineResultStatus = finalStatus?.status as string;
          const isSuccess =
            pipelineResultStatus === "completed" || pipelineResultStatus === "ready";

          if (isSuccess) {
            await updateDocumentStatus(doc.id, "indexing");
            setDocuments((prev) =>
              prev.map((d) => (d.id === doc.id ? { ...d, status: "indexing" } : d))
            );

            const chunks = await finalizePipelineIndex(
              finalStatus as Record<string, unknown>,
              doc.name,
            );

            await updateDocumentStatus(doc.id, "ready", chunks);
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === doc.id
                  ? {
                      ...d,
                      status: "ready",
                      chunks: chunks ?? d.chunks,
                      indexedAt: new Date(),
                    }
                  : d
              )
            );
            toast.success("Document indexed and ready for search.");
          } else {
            await updateDocumentStatus(doc.id, "failed");
            setDocuments((prev) =>
              prev.map((d) => (d.id === doc.id ? { ...d, status: "failed" } : d))
            );
            toast.error("Ingestion pipeline failed. Check BIMExtract logs.");
          }
        } catch (pipelineError) {
          // Pipeline call failed (e.g., BIMExtract offline)
          const msg =
            pipelineError instanceof Error
              ? pipelineError.message
              : "Pipeline error";
          await updateDocumentStatus(doc.id, "pending");
          setDocuments((prev) =>
            prev.map((d) => (d.id === doc.id ? { ...d, status: "pending" } : d))
          );
          toast.error(`Ingestion pipeline failed: ${msg}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast.error(msg);
      } finally {
        setUploading(false);
        setUploadProgress(0);
        setUploadFileName(null);
      }

      router.refresh();
    },
    [workspaceId, router]
  );

  // ── Handle file drop/select ──
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        handleUpload(files[0]);
      }
      // Reset so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleUpload]
  );

  // ── Delete document ──
  const handleDelete = useCallback(
    async (id: number) => {
      startDeleteTransition(async () => {
        const res = await deleteDocument(id);
        if (res.success) {
          setDocuments((prev) => prev.filter((d) => d.id !== id));
          toast.success("Document deleted");
        } else {
          toast.error(res.error || "Failed to delete document");
        }
        setDeleteDocId(null);
        router.refresh();
      });
    },
    [router]
  );

  // ── Re-run pipeline ──
  const handleReRun = useCallback(
    async (doc: DocumentRecord) => {
      if (!bimExtractHealthy) {
        toast.error("BIMExtract is offline. Start it with ./start-platform.sh");
        return;
      }

      toast.info("Re-running ingestion pipeline...");
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: "pending" } : d))
      );
      await updateDocumentStatus(doc.id, "pending");

      try {
        const pipeline = await bimExtract.startPipeline("ingest", {
          doc_path: doc.fileUrl,
          text_content: "",
        });

        await updateDocumentStatus(doc.id, "parsing");
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, status: "parsing" } : d))
        );

        const finalStatus = await bimExtract.pollPipeline("ingest", pipeline.job_id, {
          interval: 2000,
          timeout: 120000,
        });

        const pipelineResultStatus = finalStatus?.status as string;
        const isSuccess =
          pipelineResultStatus === "completed" || pipelineResultStatus === "ready";

        if (isSuccess) {
          await updateDocumentStatus(doc.id, "indexing");
          setDocuments((prev) =>
            prev.map((d) => (d.id === doc.id ? { ...d, status: "indexing" } : d))
          );

          const chunks = await finalizePipelineIndex(
            finalStatus as Record<string, unknown>,
            doc.name,
          );

          await updateDocumentStatus(doc.id, "ready", chunks);
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === doc.id
                ? {
                    ...d,
                    status: "ready",
                    chunks: chunks ?? d.chunks,
                    indexedAt: new Date(),
                  }
                : d
            )
          );
          toast.success("Document re-indexed successfully.");
        } else {
          await updateDocumentStatus(doc.id, "failed");
          setDocuments((prev) =>
            prev.map((d) => (d.id === doc.id ? { ...d, status: "failed" } : d))
          );
          toast.error("Re-run pipeline failed.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Pipeline error";
        await updateDocumentStatus(doc.id, "failed");
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, status: "failed" } : d))
        );
        toast.error(`Re-run failed: ${msg}`);
      }

      router.refresh();
    },
    [bimExtractHealthy, router]
  );

  // ── Refresh list ──
  const handleRefresh = useCallback(() => {
    startRefreshTransition(async () => {
      router.refresh();
      toast.success("Documents refreshed");
    });
  }, [router]);

  // ── Derive document lists ──
  const pipelineDocs = documents.filter(
    (d) => d.status !== "ready" && d.status !== "completed"
  );
  const indexedDocs = documents.filter(
    (d) => d.status === "ready" || d.status === "completed"
  );

  // ── Render ──
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Documents"
        description="Add documents to your searchable knowledge base."
        breadcrumbs={[{ label: "Documents" }]}
        icon={<FileText className="size-5" />}
        primaryAction={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshPending}
          >
            {refreshPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
        }
      />

      {/* Connection banner */}
      {someBackendOffline && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Search backend offline
            </p>
            <p className="mt-1 text-amber-600/70 dark:text-amber-400/70">
              BIMExtract or BIMIndex is unreachable. Start the platform with{" "}
              <code className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-xs">
                ./start-platform.sh
              </code>{" "}
              to enable document ingestion and search.
            </p>
          </div>
        </div>
      )}

      {/* Upload dropzone */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="p-0">
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
              isDragOver
                ? "border-primary/50 bg-primary/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]",
              uploading && "pointer-events-none opacity-60"
            )}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            aria-label="Upload documents dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
              onChange={handleFileSelect}
              multiple
            />

            {uploading ? (
              <div className="flex w-full max-w-sm flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Uploading {uploadFileName}...
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {uploadProgress}%
                </p>
              </div>
            ) : (
              <>
                <UploadCloud className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Drop files here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, PNG, JPG, JPEG, TXT — up to 50MB
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <strong>Documents</strong> (PDFs, images, text), not BIM
                  models
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline status table */}
      {pipelineDocs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Pipeline Status
          </h2>
          <div className="flex flex-col gap-2">
            {pipelineDocs.map((doc) => {
              const stage = getStageIndex(doc.status);
              const statusCfg = getStatusConfig(doc.status);

              return (
                <div
                  key={doc.id}
                  className="glass-panel flex flex-col gap-3 rounded-xl border border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getMimeIcon(doc.mimeType)}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.mimeType ?? "Unknown type"}
                        {" · "}
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Pipeline stage indicator */}
                    <div className="flex items-center gap-1.5">
                      {PIPELINE_STAGES.map((s, i) => {
                        const isActive = stage >= i;
                        const isCurrent = stage === i;
                        const isDone = stage > i;
                        return (
                          <Tooltip key={s}>
                            <TooltipTrigger>
                              <div
                                className={cn(
                                  "flex size-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                                  isDone &&
                                    "bg-emerald-500/20 text-emerald-500",
                                  isCurrent &&
                                    !isDone &&
                                    "bg-primary/20 text-primary",
                                  !isActive &&
                                    "bg-white/5 text-zinc-600"
                                )}
                              >
                                {isDone ? (
                                  <CircleCheck className="size-3" />
                                ) : isCurrent && !isTerminal(doc.status) ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  i + 1
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        statusCfg.bg
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", statusCfg.dot)}
                        aria-hidden="true"
                      />
                      {statusCfg.label}
                    </span>

                    {/* Actions */}

                    {doc.status === "failed" || doc.status === "error" ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleReRun(doc)}
                            aria-label="Re-run pipeline"
                          >
                            <RefreshCw className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Re-run</TooltipContent>
                      </Tooltip>
                    ) : null}

                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-400 hover:text-red-300"
                          onClick={() => setDeleteDocId(doc.id)}
                          aria-label="Delete document"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Indexed documents list */}
      {indexedDocs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Indexed Documents
          </h2>
          <div className="flex flex-col gap-2">
            {indexedDocs.map((doc) => (
              <div
                key={doc.id}
                className="glass-panel flex flex-col gap-3 rounded-xl border border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getMimeIcon(doc.mimeType)}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.mimeType ?? "Unknown type"}
                      {doc.chunks != null && doc.chunks > 0 && (
                        <>
                          {" · "}
                          {doc.chunks} chunk{doc.chunks !== 1 ? "s" : ""}
                        </>
                      )}
                      {doc.indexedAt && (
                        <>
                          {" · "}Indexed {formatDate(doc.indexedAt)}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    Ready
                  </span>

                  {/* View chunks if available */}
                  {doc.chunks != null && doc.chunks > 0 && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label="View document details"
                          onClick={() =>
                            toast.info(
                              `"${doc.name}" has ${doc.chunks} chunk${doc.chunks !== 1 ? "s" : ""}`
                            )
                          }
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {doc.chunks} chunk{doc.chunks !== 1 ? "s" : ""}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Download link */}
                  {doc.fileUrl && (
                    <Tooltip>
                      <TooltipTrigger>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Download document"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                          >
                            <svg
                              className="size-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                              />
                            </svg>
                          </Button>
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>Download</TooltipContent>
                    </Tooltip>
                  )}

                  {/* Re-run */}
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleReRun(doc)}
                        aria-label="Re-index document"
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Re-index</TooltipContent>
                  </Tooltip>

                  {/* Delete */}
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-400 hover:text-red-300"
                        onClick={() => setDeleteDocId(doc.id)}
                        aria-label="Delete document"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !uploading && (
        <EmptyState
          icon={Files}
          title="Upload your first document"
          description="Add PDFs, images, or text files to your searchable knowledge base. Once indexed, you can search across them from the Research page."
          primaryAction={{
            label: "Select files",
            onClick: () => fileInputRef.current?.click(),
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDocId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDocId(null);
        }}
        title="Delete document"
        description="Are you sure you want to delete this document? It will be removed from search results and the ingestion pipeline."
        confirmLabel="Delete"
        destructive
        loading={deletePending}
        onConfirm={() => {
          if (deleteDocId !== null) {
            handleDelete(deleteDocId);
          }
        }}
      />
    </div>
  );
}
