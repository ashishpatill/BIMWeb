"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  KeyRound,
  Plus,
  Copy,
  RotateCcw,
  Ban,
  MoreHorizontal,
  ExternalLink,
  FileJson,
  Loader2,
  ShieldCheck,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeader,
  EmptyState,
  ConfirmDialog,
} from "@/components/common";
import {
  createApiKey,
  revokeApiKey,
  rotateApiKey,
} from "@/lib/actions";

// ── Types ─────────────────────────────────────────────────────

interface ApiKeyRow {
  id: number;
  prefix: string;
  label: string;
  scopes: string[] | null;
  rateLimitPerMin: number | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

interface ApiKeysClientProps {
  initialKeys: ApiKeyRow[];
}

// ── Constants ──────────────────────────────────────────────────

const ALL_SCOPES = [
  "projects:read",
  "projects:write",
  "models:read",
  "models:write",
  "search:read",
  "documents:write",
  "audit:read",
] as const;

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function maskKey(prefix: string): string {
  return `${prefix}••••`;
}

function getStatus(key: ApiKeyRow): { label: string; className: string } {
  if (key.revokedAt) {
    return { label: "Revoked", className: "text-red-400" };
  }
  return { label: "Active", className: "text-emerald-400" };
}

// ── Component ──────────────────────────────────────────────────

export function ApiKeysClient({ initialKeys }: ApiKeysClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [actionLoading, setActionLoading] = useState(false);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newRateLimit, setNewRateLimit] = useState("60");
  const [newScopes, setNewScopes] = useState<string[]>(["projects:read"]);

  // Reveal dialog state
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState("");
  const [revealedLabel, setRevealedLabel] = useState("");

  // Revoke confirm state
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);

  // Rotate confirm state
  const [rotateTarget, setRotateTarget] = useState<ApiKeyRow | null>(null);

  // ── Scope toggling ─────────────────────────────────────────

  const toggleScope = useCallback((scope: string) => {
    setNewScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope],
    );
  }, []);

  // ── Create key ─────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!newLabel.trim()) {
      toast.error("Label is required");
      return;
    }

    setActionLoading(true);
    try {
      const result = await createApiKey(
        newLabel.trim(),
        newScopes.length > 0 ? newScopes : undefined,
        Math.max(1, parseInt(newRateLimit, 10) || 60),
      );

      if (result.success) {
        setRevealedKey(result.plaintext);
        setRevealedLabel(newLabel.trim());
        setRevealOpen(true);
        setCreateOpen(false);

        // Refresh keys list
        startTransition(() => {
          router.refresh();
        });

        toast.success("API key created");
      } else {
        toast.error(result.error || "Failed to create API key");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setActionLoading(false);
    }
  }, [newLabel, newScopes, newRateLimit, router]);

  // ── Revoke key ─────────────────────────────────────────────

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;

    setActionLoading(true);
    try {
      const result = await revokeApiKey(revokeTarget.id);

      if (result.success) {
        toast.success("API key revoked");
        setRevokeTarget(null);
        startTransition(() => {
          router.refresh();
        });

        // Update local state optimistically
        setKeys((prev) =>
          prev.map((k) =>
            k.id === revokeTarget.id
              ? { ...k, revokedAt: new Date() }
              : k,
          ),
        );
      } else {
        toast.error(result.error || "Failed to revoke API key");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setActionLoading(false);
    }
  }, [revokeTarget, router]);

  // ── Rotate key ─────────────────────────────────────────────

  const handleRotate = useCallback(async () => {
    if (!rotateTarget) return;

    setActionLoading(true);
    try {
      const result = await rotateApiKey(rotateTarget.id);

      if (result.success) {
        setRotateTarget(null);
        // Reveal dialog shows the new key
        setRevealedKey(result.plaintext);
        setRevealedLabel(rotateTarget.label);
        setRevealOpen(true);

        startTransition(() => {
          router.refresh();
        });

        toast.success("API key rotated");
      } else {
        toast.error(result.error || "Failed to rotate API key");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setActionLoading(false);
    }
  }, [rotateTarget, router]);

  // ── Copy handlers ──────────────────────────────────────────

  const copyToClipboard = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(label);
      } catch {
        toast.error("Failed to copy");
      }
    },
    [],
  );

  // ── Reset create form ──────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setNewLabel("");
    setNewRateLimit("60");
    setNewScopes(["projects:read"]);
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="API Keys"
        description="Generate keys to access the BIMWeb REST API."
        breadcrumbs={[{ label: "API Keys" }]}
        primaryAction={
          <Button
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Create key
          </Button>
        }
      />

      {/* API docs links */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Link
          href="/api/docs"
          className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
        >
          <ExternalLink className="size-3.5" />
          API Documentation
        </Link>
        <Link
          href="/api/v1/openapi.json"
          className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
        >
          <FileJson className="size-3.5" />
          OpenAPI Schema
        </Link>
      </div>

      {/* Empty state */}
      {keys.length === 0 && !isPending && (
        <EmptyState
          icon={KeyRound}
          title="Create your first API key"
          description="Generate an API key to start building with the BIMWeb REST API."
          primaryAction={{
            label: "Create API key",
            onClick: () => {
              resetCreateForm();
              setCreateOpen(true);
            },
          }}
        />
      )}

      {/* Loading skeleton */}
      {isPending && keys.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-white/5 bg-white/[0.02]">
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="size-8 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 bg-white/5" />
                  <Skeleton className="h-3 w-56 bg-white/5" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-white/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Keys table */}
      {keys.length > 0 && (
        <div className="glass-panel overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last used</th>
                <th className="px-4 py-3">Rate limit</th>
                <th className="px-4 py-3">Scopes</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keys.map((key) => {
                const status = getStatus(key);
                const isRevoked = !!key.revokedAt;

                return (
                  <tr
                    key={key.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {key.label}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              className="cursor-pointer transition-colors hover:text-zinc-300"
                              onClick={() =>
                                copyToClipboard(
                                  key.prefix,
                                  "Prefix copied",
                                )
                              }
                              aria-label="Copy key prefix"
                            >
                              {maskKey(key.prefix)}
                            </button>
                          }
                        />
                        <TooltipContent>Copy prefix</TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      <span title={`Created: ${key.createdAt.toISOString()}`}>
                        {formatDate(key.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {key.lastUsedAt ? (
                        <span
                          title={`Last used: ${key.lastUsedAt.toISOString()}`}
                        >
                          {formatDate(key.lastUsedAt)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {key.rateLimitPerMin ? (
                        <span>{key.rateLimitPerMin} req/min</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="max-w-[180px] px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(key.scopes ?? []).map((scope) => (
                          <span
                            key={scope}
                            className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={status.className}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
                                    aria-label="Key actions"
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
                              copyToClipboard(
                                key.prefix,
                                "Prefix copied",
                              )
                            }
                          >
                            <Copy className="mr-2 size-4" />
                            Copy prefix
                          </DropdownMenuItem>
                          {!isRevoked && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setRevokeTarget(key)}
                              >
                                <Ban className="mr-2 size-4" />
                                Revoke
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setRotateTarget(key)}
                              >
                                <RotateCcw className="mr-2 size-4" />
                                Rotate
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Dialog ── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access. You will only see
              the full key once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Label */}
            <div className="space-y-1.5">
              <Label htmlFor="key-label">Label</Label>
              <Input
                id="key-label"
                placeholder="e.g. Production CI key"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>

            {/* Rate limit */}
            <div className="space-y-1.5">
              <Label htmlFor="key-rate-limit">
                Rate limit (requests per minute)
              </Label>
              <Input
                id="key-rate-limit"
                type="number"
                min={1}
                max={10000}
                placeholder="60"
                value={newRateLimit}
                onChange={(e) => setNewRateLimit(e.target.value)}
              />
            </div>

            {/* Scopes */}
            <div className="space-y-1.5">
              <Label>Scopes</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      newScopes.includes(scope)
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-white/10 text-zinc-400 hover:border-white/20"
                    }`}
                    aria-label={`Toggle scope ${scope}`}
                    aria-pressed={newScopes.includes(scope)}
                  >
                    <ShieldCheck className="size-3.5 shrink-0" />
                    {scope}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={actionLoading}>
              {actionLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── One-Time Reveal Dialog ── */}
      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
            <DialogDescription>
              Copy this key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2 text-xs text-amber-300">
                <EyeOff className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <strong>You won&apos;t see this again.</strong> For security
                  reasons, the full key is only shown once. If you lose it,
                  you&apos;ll need to rotate the key.
                </span>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs text-zinc-400">
                {revealedLabel}
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg bg-zinc-900 px-3 py-2.5 font-mono text-xs text-emerald-400">
                  {revealedKey}
                </code>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() =>
                          copyToClipboard(revealedKey, "Key copied")
                        }
                        aria-label="Copy full key"
                      >
                        <Copy className="size-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>Copy key</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setRevealOpen(false);
                setRevealedKey("");
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirm Dialog ── */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revoke API key"
        description={
          revokeTarget
            ? `Are you sure you want to revoke "${revokeTarget.label}"? Any services using this key will immediately lose access.`
            : ""
        }
        confirmLabel="Revoke"
        destructive
        loading={actionLoading}
        onConfirm={handleRevoke}
      />

      {/* ── Rotate Confirm Dialog ── */}
      <ConfirmDialog
        open={!!rotateTarget}
        onOpenChange={(open) => {
          if (!open) setRotateTarget(null);
        }}
        title="Rotate API key"
        description={
          rotateTarget
            ? `Rotating "${rotateTarget.label}" will revoke the current key and create a new one with the same settings.`
            : ""
        }
        confirmLabel="Rotate"
        loading={actionLoading}
        onConfirm={handleRotate}
      />
    </div>
  );
}
