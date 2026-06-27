"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ScrollText,
  Search,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Clock,
  Filter,
  X,
  ExternalLink,
  Eye,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Types ───────────────────────────────────────────────

export interface AuditLogRow {
  id: number;
  action: string;
  actorId: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface UserInfo {
  kindeId: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface ProjectInfo {
  id: number;
  name: string;
}

export interface AuditFilters {
  actor: string;
  action: string;
  targetType: string;
  dateFrom: string;
  dateTo: string;
}

export interface AuditClientProps {
  auditLogs: AuditLogRow[];
  users: UserInfo[];
  projects: ProjectInfo[];
  totalCount?: number;
  currentOffset?: number;
  limit?: number;
  filters?: AuditFilters;
  error?: string;
}

// ─── Action label map ────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  "project.create": "Created project",
  "project.update": "Updated project",
  "project.delete": "Deleted project",
  "project.duplicate": "Duplicated project",
  "project.share": "Shared project",
  "model.create": "Uploaded model",
  "model.update": "Updated model",
  "model.delete": "Deleted model",
  "model.view": "Viewed model",
  "team_member.invite": "Invited team member",
  "team_member.remove": "Removed team member",
  "team_member.role_update": "Changed team member role",
  "team_member.join": "Team member joined",
  "api_key.create": "Created API key",
  "api_key.revoke": "Revoked API key",
  "api_key.rotate": "Rotated API key",
  "document.create": "Created document",
  "document.delete": "Deleted document",
  "workspace.create": "Created workspace",
  "workspace.update": "Updated workspace",
  "workspace.delete": "Deleted workspace",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").replace(/\./g, " — ");
}

// ─── Target type labels ──────────────────────────────────

const TARGET_TYPE_LABELS: Record<string, string> = {
  project: "Project",
  model: "Model",
  team_member: "Team Member",
  api_key: "API Key",
  document: "Document",
  workspace: "Workspace",
};

function formatTargetType(type: string): string {
  return TARGET_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

// ─── Action types for filter ─────────────────────────────

const ACTION_TYPES = [
  { value: "", label: "All actions" },
  { value: "project.create", label: "Created project" },
  { value: "project.update", label: "Updated project" },
  { value: "project.delete", label: "Deleted project" },
  { value: "project.share", label: "Shared project" },
  { value: "model.create", label: "Uploaded model" },
  { value: "model.delete", label: "Deleted model" },
  { value: "team_member.invite", label: "Invited team member" },
  { value: "team_member.remove", label: "Removed team member" },
  { value: "team_member.role_update", label: "Changed role" },
  { value: "api_key.create", label: "Created API key" },
  { value: "api_key.revoke", label: "Revoked API key" },
  { value: "document.create", label: "Created document" },
  { value: "document.delete", label: "Deleted document" },
];

const TARGET_TYPES = [
  { value: "", label: "All targets" },
  { value: "project", label: "Project" },
  { value: "model", label: "Model" },
  { value: "team_member", label: "Team Member" },
  { value: "api_key", label: "API Key" },
  { value: "document", label: "Document" },
  { value: "workspace", label: "Workspace" },
];

// ─── Helpers ─────────────────────────────────────────────

function getUserById(users: UserInfo[], id: string): UserInfo | undefined {
  return users.find((u) => u.kindeId === id);
}

function getUserDisplayName(user: UserInfo | undefined): string {
  if (!user) return "Unknown";
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  }
  return user.name || user.email;
}

function getAvatarInitials(user: UserInfo | undefined): string {
  if (!user) return "?";
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  const name = user.name || user.email;
  return name.slice(0, 2).toUpperCase();
}

function formatTimestamp(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative: string;
  if (diffMins < 1) relative = "Just now";
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return relative;
}

function formatAbsoluteTimestamp(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getTargetLink(
  targetType: string,
  targetId: string,
  projects: ProjectInfo[]
): { label: string; href?: string } | null {
  if (targetType === "project") {
    const project = projects.find((p) => p.id === Number(targetId));
    return {
      label: project?.name ?? `Project #${targetId}`,
      href: `/dashboard/projects/${targetId}`,
    };
  }
  if (targetType === "model") {
    return {
      label: `Model #${targetId}`,
      href: undefined, // We don't have model<->project mapping here
    };
  }
  if (targetType === "team_member") {
    return { label: `Team Member #${targetId}` };
  }
  if (targetType === "api_key") {
    return { label: `API Key #${targetId}` };
  }
  if (targetType === "document") {
    return { label: `Document #${targetId}` };
  }
  if (targetType === "workspace") {
    return { label: `Workspace #${targetId}` };
  }
  return { label: `${formatTargetType(targetType)} #${targetId}` };
}

// ─── CSV/JSON Export ─────────────────────────────────────

function exportCSV(rows: AuditLogRow[], users: UserInfo[]) {
  const headers = ["Timestamp", "Actor", "Email", "Action", "Target Type", "Target ID", "Metadata"];
  const csvRows = rows.map((row) => {
    const user = getUserById(users, row.actorId);
    const actorName = getUserDisplayName(user);
    const metadata = row.metadata ? JSON.stringify(row.metadata).replace(/"/g, '""') : "";
    return [
      formatAbsoluteTimestamp(row.createdAt),
      `"${actorName}"`,
      `"${user?.email ?? ""}"`,
      `"${formatAction(row.action)}"`,
      `"${formatTargetType(row.targetType)}"`,
      `"${row.targetId}"`,
      `"${metadata}"`,
    ].join(",");
  });

  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Audit log exported as CSV");
}

function exportJSON(rows: AuditLogRow[]) {
  const data = rows.map((row) => ({
    timestamp: row.createdAt,
    action: row.action,
    actorId: row.actorId,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: row.metadata,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Audit log exported as JSON");
}

// ─── Main Component ─────────────────────────────────────

export function AuditClient({
  auditLogs,
  users,
  projects,
  totalCount = 0,
  currentOffset = 0,
  limit = 50,
  filters: initialFilters,
  error,
}: AuditClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filter state (local for the form, synced to URL on submit)
  const [actorFilter, setActorFilter] = useState(initialFilters?.actor ?? searchParams.get("actor") ?? "");
  const [actionFilter, setActionFilter] = useState(initialFilters?.action ?? searchParams.get("action") ?? "");
  const [targetTypeFilter, setTargetTypeFilter] = useState(initialFilters?.targetType ?? searchParams.get("targetType") ?? "");
  const [dateFromFilter, setDateFromFilter] = useState(initialFilters?.dateFrom ?? searchParams.get("dateFrom") ?? "");
  const [dateToFilter, setDateToFilter] = useState(initialFilters?.dateTo ?? searchParams.get("dateTo") ?? "");

  // Error state
  const [errorState, setErrorState] = useState<string | null>(error ?? null);

  // ─── Apply Filters ───────────────────────────────────

  const applyFilters = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (actorFilter.trim()) params.set("actor", actorFilter.trim());
      if (actionFilter) params.set("action", actionFilter);
      if (targetTypeFilter) params.set("targetType", targetTypeFilter);
      if (dateFromFilter) params.set("dateFrom", dateFromFilter);
      if (dateToFilter) params.set("dateTo", dateToFilter);
      const qs = params.toString();
      router.push(`/dashboard/audit${qs ? `?${qs}` : ""}`);
    });
  }, [actorFilter, actionFilter, targetTypeFilter, dateFromFilter, dateToFilter, router]);

  const clearFilters = useCallback(() => {
    setActorFilter("");
    setActionFilter("");
    setTargetTypeFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    startTransition(() => {
      router.push("/dashboard/audit");
    });
  }, [router]);

  // ─── Pagination ──────────────────────────────────────

  const hasMore = auditLogs.length >= limit && currentOffset + auditLogs.length < totalCount;
  const hasPrevious = currentOffset > 0;

  const loadMore = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("offset", String(currentOffset + limit));
      router.push(`/dashboard/audit?${params.toString()}`);
    });
  }, [searchParams, currentOffset, limit, router]);

  const loadPrevious = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      const newOffset = Math.max(0, currentOffset - limit);
      if (newOffset === 0) params.delete("offset");
      else params.set("offset", String(newOffset));
      router.push(`/dashboard/audit?${params.toString()}`);
    });
  }, [searchParams, currentOffset, limit, router]);

  // ─── Derived state ───────────────────────────────────

  const hasActiveFilters = !!(actorFilter || actionFilter || targetTypeFilter || dateFromFilter || dateToFilter);
  const isEmpty = auditLogs.length === 0 && !errorState && !isPending;
  const isFilteredEmpty = auditLogs.length === 0 && hasActiveFilters && !isPending;

  // ─── Render ──────────────────────────────────────────

  if (errorState) {
    return (
      <div className="flex flex-col gap-6 pb-10">
        <PageHeader
          title="Audit Log"
          description="A record of activity in your workspace."
          breadcrumbs={[{ label: "Audit Log" }]}
        />
        <div className="glass-panel flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <h3 className="text-base font-medium text-foreground">Failed to load audit log</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{errorState}</p>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setErrorState(null);
                router.refresh();
              }}
            >
              <RefreshCw className="mr-1.5 size-4" />
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Audit Log"
        description="A record of activity in your workspace."
        breadcrumbs={[{ label: "Audit Log" }]}
        icon={<ScrollText className="size-5" />}
        secondaryActions={
          auditLogs.length > 0 ? (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <span
                    onClick={() => exportCSV(auditLogs, users)}
                    className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground hover:bg-muted"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") exportCSV(auditLogs, users); }}
                    aria-label="Export as CSV"
                  >
                    <FileSpreadsheet className="size-4" />
                    CSV
                  </span>
                </TooltipTrigger>
                <TooltipContent>Export audit log as CSV</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <span
                    onClick={() => exportJSON(auditLogs)}
                    className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground hover:bg-muted"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") exportJSON(auditLogs); }}
                    aria-label="Export as JSON"
                  >
                    <FileJson className="size-4" />
                    JSON
                  </span>
                </TooltipTrigger>
                <TooltipContent>Export audit log as JSON</TooltipContent>
              </Tooltip>
            </div>
          ) : undefined
        }
      />

      {/* Filters Bar */}
      <div className="glass-panel rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Actor filter */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actor-filter" className="text-xs text-muted-foreground">
              Actor
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="actor-filter"
                placeholder="Name or email…"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="h-8 w-48 pl-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
              />
            </div>
          </div>

          {/* Action type filter */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="action-filter" className="text-xs text-muted-foreground">
              Action
            </Label>
            <Select value={actionFilter} onValueChange={(v) => v !== null && setActionFilter(v)}>
              <SelectTrigger id="action-filter" className="h-8 w-44">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((at) => (
                  <SelectItem key={at.value} value={at.value}>
                    {at.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target type filter */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="target-type-filter" className="text-xs text-muted-foreground">
              Target
            </Label>
            <Select value={targetTypeFilter} onValueChange={(v) => v !== null && setTargetTypeFilter(v)}>
              <SelectTrigger id="target-type-filter" className="h-8 w-40">
                <SelectValue placeholder="All targets" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_TYPES.map((tt) => (
                  <SelectItem key={tt.value} value={tt.value}>
                    {tt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>

          {/* Apply / Clear */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={applyFilters}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Filter className="mr-1.5 size-3.5" />
              )}
              Filter
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="mr-1.5 size-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results summary */}
      {!isEmpty && !isFilteredEmpty && !isPending && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {auditLogs.length} of {totalCount} event{totalCount !== 1 ? "s" : ""}
            {currentOffset > 0 && ` (page ${Math.floor(currentOffset / limit) + 1})`}
          </span>
        </div>
      )}

      {/* Loading State */}
      {isPending && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="glass-panel flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4"
            >
              <Skeleton className="size-8 shrink-0 rounded-full bg-white/5" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-48 bg-white/5" />
                <Skeleton className="h-3 w-32 bg-white/5" />
              </div>
              <Skeleton className="h-3 w-20 bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {/* Filtered Empty State */}
      {isFilteredEmpty && (
        <EmptyState
          icon={Search}
          title="No events match these filters"
          description="Try different filter criteria or clear filters to see all events."
          primaryAction={{ label: "Clear filters", onClick: clearFilters }}
        />
      )}

      {/* Empty State */}
      {isEmpty && !isPending && (
        <EmptyState
          icon={ScrollText}
          title="No activity yet"
          description="Events like project creation, model uploads, and team changes will appear here."
        />
      )}

      {/* Table */}
      {auditLogs.length > 0 && !isPending && (
        <div className="glass-panel overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Target
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((row) => {
                  const user = getUserById(users, row.actorId);
                  const initials = getAvatarInitials(user);
                  const displayName = getUserDisplayName(user);
                  const target = getTargetLink(row.targetType, row.targetId, projects);
                  const hasMetadata = row.metadata && Object.keys(row.metadata).length > 0;

                  return (
                    <tr
                      key={row.id}
                      className="group border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="size-3" />
                              {formatTimestamp(row.createdAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatAbsoluteTimestamp(row.createdAt)}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">
                              {displayName}
                            </p>
                            {user?.email && (
                              <p className="truncate text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-primary/5 px-2 py-0.5 text-sm text-foreground">
                          {formatAction(row.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {target?.href ? (
                          <a
                            href={target.href}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {target.label}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {target?.label ?? `${formatTargetType(row.targetType)} #${row.targetId}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasMetadata ? (
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label="View metadata"
                                />
                              }
                            >
                              <Eye className="size-3.5" />
                            </PopoverTrigger>
                            <PopoverContent
                              side="left"
                              align="center"
                              className="max-w-xs"
                            >
                              <div className="space-y-2">
                                <h4 className="text-xs font-medium text-muted-foreground">
                                  Event Details
                                </h4>
                                <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">
                                  {JSON.stringify(row.metadata, null, 2)}
                                </pre>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {auditLogs.length > 0 && (hasPrevious || hasMore) && (
        <div className="flex items-center justify-center gap-3">
          {hasPrevious && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadPrevious}
              disabled={isPending}
            >
              <ChevronRight className="mr-1.5 size-3.5 rotate-180" />
              Previous
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            Page {Math.floor(currentOffset / limit) + 1}
          </span>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={isPending}
            >
              Load more
              <ChevronRight className="ml-1.5 size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
