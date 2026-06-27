"use client";

import { useState, useTransition, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FolderGit2,
  Layers,
  Users,
  FileText,
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  SkipForward,
  AlertTriangle,
  Terminal,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  StatCard,
  ConnectionBadge,
  EmptyState,
} from "@/components/common";
import type { ConnectionStatus } from "@/components/common";
import { updateUserOnboarding } from "@/lib/actions";
import { Skeleton } from "@/components/ui/skeleton";

// ── Public types (imported by server page) ──────────────────────────

export interface RecentProject {
  id: number;
  name: string;
  description: string | null;
  modelCount: number;
}

export interface ActivityItem {
  id: number;
  action: string;
  actorId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface EcosystemHealthEntry {
  status: string;
  ok: boolean;
}

export type EcosystemHealthMap = Record<string, EcosystemHealthEntry>;

// ── Props ──────────────────────────────────────────────────────────

interface DashboardClientProps {
  userFirstName: string | null;
  workspaceName: string;
  projectCount: number;
  modelCount: number;
  teamCount: number;
  documentCount: number;
  recentProjects: RecentProject[];
  recentActivity: ActivityItem[];
  ecosystemHealth: EcosystemHealthMap;
  onboarding: Record<string, unknown> | null;
  totalProjectsCount: number;
}

// ── Constants ──────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { key: "workspace_created", label: "Create a workspace", href: "/dashboard/settings?tab=workspace" },
  { key: "project_created", label: "Create your first project", href: "/dashboard/projects" },
  { key: "model_uploaded", label: "Upload a BIM model", href: "/dashboard/models" },
  { key: "viewer_opened", label: "Open a model in the 3D viewer", href: "/dashboard/projects" },
  { key: "research_asked", label: "Ask your first research question", href: "/dashboard/research" },
  { key: "teammate_invited", label: "Invite a teammate", href: "/dashboard/team" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  "project.create": "Created project",
  "project.update": "Updated project",
  "project.delete": "Deleted project",
  "model.create": "Uploaded model",
  "model.delete": "Deleted model",
  "document.create": "Added document",
  "document.delete": "Deleted document",
  "team_member.invite": "Invited team member",
  "team_member.role_update": "Changed team member role",
  "team_member.remove": "Removed team member",
  "api_key.create": "Created API key",
  "api_key.revoke": "Revoked API key",
  "api_key.rotate": "Rotated API key",
  "workspace.create": "Created workspace",
  "search.query": "Performed search",
};

// ── Helpers ────────────────────────────────────────────────────────

function getActionLabel(action: string, metadata: Record<string, unknown> | null): string {
  const label = ACTION_LABELS[action] ?? action.replace(/_/g, " ");
  const name = metadata?.name;
  if (typeof name === "string") {
    return `${label} "${name}"`;
  }
  return label;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mapHealthToStatus(entry: EcosystemHealthEntry): ConnectionStatus {
  if (entry.ok) return "healthy";
  if (entry.status === "unreachable") return "offline";
  return "degraded";
}

function getFirstIncompleteStep(
  onboarding: Record<string, unknown>,
): (typeof ONBOARDING_STEPS)[number] | null {
  for (const step of ONBOARDING_STEPS) {
    if (!onboarding[step.key]) return step;
  }
  return null;
}

function isOnboardingComplete(onboarding: Record<string, unknown>): boolean {
  if (onboarding.dismissed) return true;
  return ONBOARDING_STEPS.every((step) => onboarding[step.key]);
}

// ── Component ──────────────────────────────────────────────────────

export function DashboardClient({
  userFirstName,
  workspaceName,
  projectCount,
  modelCount,
  teamCount,
  documentCount,
  recentProjects,
  recentActivity,
  ecosystemHealth,
  onboarding,
  totalProjectsCount,
}: DashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const handleSkipOnboarding = useCallback(() => {
    startTransition(async () => {
      await updateUserOnboarding({ dismissed: true });
      setOnboardingDismissed(true);
    });
  }, []);

  // Derived state
  const isEmptyWorkspace =
    projectCount === 0 && modelCount === 0 && teamCount === 0 && documentCount === 0;

  const healthEntries = Object.entries(ecosystemHealth);
  const anyOffline = healthEntries.some(([, entry]) => !entry.ok);
  const showOnboarding =
    onboarding &&
    !onboardingDismissed &&
    !isOnboardingComplete(onboarding as Record<string, unknown>);
  const nextStep = onboarding ? getFirstIncompleteStep(onboarding as Record<string, unknown>) : null;

  const greetName = userFirstName ? `Welcome, ${userFirstName}` : "Welcome";

  // ── Empty workspace ──────────────────────────────────────────────
  if (isEmptyWorkspace) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PageHeader
          title={greetName}
          description={`You are in "${workspaceName}"`}
          breadcrumbs={[{ label: "Overview" }]}
        />
        <EmptyState
          icon={FolderGit2}
          title="Create your first project"
          description="Projects are where you organize your BIM models, documents, and team collaboration. Get started by creating a project."
          primaryAction={{ label: "New Project", href: "/dashboard/projects" }}
          secondaryAction={{ label: "Learn more", href: "/dashboard/research" }}
        />
        <div className="mt-6">
          <PageHeader title="Platform Health" breadcrumbs={[]} />
          <div className="flex flex-wrap gap-3">
            {healthEntries.map(([name, entry]) => (
              <ConnectionBadge
                key={name}
                label={name}
                status={mapHealthToStatus(entry)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Normal view ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title={greetName}
        description={`Workspace: ${workspaceName}`}
        breadcrumbs={[{ label: "Overview" }]}
      />

      {/* ── Onboarding checklist ── */}
      {showOnboarding && nextStep && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-amber-400" />
                Get started with BIMWeb
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ONBOARDING_STEPS.map((step) => {
                  const done = !!(onboarding as Record<string, unknown>)[step.key];
                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                        done
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                          : step.key === nextStep.key
                            ? "border-primary/30 bg-primary/5 text-foreground"
                            : "border-white/5 text-zinc-400"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-zinc-500" />
                      )}
                      <span className="flex-1">{step.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Link href={nextStep.href}>
                  <Button size="sm" className="gap-1.5">
                    Continue <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipOnboarding}
                  disabled={isPending}
                  className="gap-1.5 text-zinc-400"
                >
                  <SkipForward className="size-3.5" />
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Partial-offline amber banner ── */}
      {anyOffline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-amber-300">Some platform services are offline</p>
            <p className="mt-1 text-amber-400/80">
              Start the platform services to enable Research, Documents, and Platform Health
              features.
            </p>
            <code className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300">
              <Terminal className="size-3.5" />
              ./start-platform.sh
            </code>
          </div>
        </motion.div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Projects"
          value={projectCount}
          icon={FolderGit2}
          source="Real-time from database"
        />
        <StatCard
          label="Models Processed"
          value={modelCount}
          icon={Layers}
          source="3D viewer ready"
        />
        <StatCard
          label="Team Collaborators"
          value={teamCount}
          icon={Users}
          source="Access controls active"
        />
        <StatCard
          label="Indexed Documents"
          value={documentCount}
          icon={FileText}
          source="Search knowledge base"
        />
      </div>

      {/* ── Bottom grid: Recent projects + Activity + Quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent projects */}
        <Card className="lg:col-span-2 glass-panel border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <EmptyState
                icon={FolderGit2}
                title="No projects yet"
                description="Create your first project to get started."
                primaryAction={{ label: "New Project", href: "/dashboard/projects" }}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="group block rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:border-primary/20 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium text-zinc-100 group-hover:text-primary transition-colors">
                          {project.name}
                        </h4>
                        {project.description && (
                          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-zinc-600 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="inline-flex items-center rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                        {project.modelCount} {project.modelCount === 1 ? "model" : "models"}
                      </span>
                    </div>
                  </Link>
                ))}
                {totalProjectsCount > 4 && (
                  <Link
                    href="/dashboard/projects"
                    className="col-span-full mt-1 text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    View all {totalProjectsCount} projects →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="glass-panel border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickActionLink
              href="/dashboard/projects"
              icon={FolderGit2}
              label="New Project"
              description="Configure a building folder"
            />
            <QuickActionLink
              href="/dashboard/models"
              icon={Upload}
              label="Upload Model"
              description="Import IFC or glTF files"
            />
            <QuickActionLink
              href="/dashboard/research"
              icon={Sparkles}
              label="Ask Research"
              description="Query your BIM knowledge base"
            />
            <QuickActionLink
              href="/dashboard/team"
              icon={UserPlus}
              label="Invite"
              description="Add collaborators to project"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Activity + Health row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="lg:col-span-2 glass-panel border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Your workspace activity will appear here as you create projects, upload models, and collaborate with your team."
              />
            ) : (
              <div className="space-y-0">
                {recentActivity.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 py-3 ${
                      index < recentActivity.length - 1
                        ? "border-b border-white/5"
                        : ""
                    }`}
                  >
                    <div className="mt-0.5 flex size-2 shrink-0 rounded-full bg-primary/40" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200">
                        {getActionLabel(item.action, item.metadata)}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatTime(item.createdAt)}
                      </p>
                    </div>
                    {/* Show a subtle type tag for the target type */}
                    {item.action.startsWith("project.") && (
                      <span className="hidden sm:inline-flex items-center rounded-md border border-white/10 px-1.5 py-0 text-[10px] font-medium text-zinc-400 h-5">
                        project
                      </span>
                    )}
                    {item.action.startsWith("model.") && (
                      <span className="hidden sm:inline-flex items-center rounded-md border border-white/10 px-1.5 py-0 text-[10px] font-medium text-zinc-400 h-5">
                        model
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform health summary */}
        <Card className="glass-panel border border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthEntries.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                healthEntries.map(([name, entry]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium text-zinc-200">{name}</span>
                    <ConnectionBadge status={mapHealthToStatus(entry)} />
                  </div>
                ))
              )}
              <Link
                href="/dashboard/health"
                className="mt-2 flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                View full health dashboard <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────

function QuickActionLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <button
        type="button"
        className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10 text-left group"
      >
        <div className="bg-primary/20 p-2 rounded-lg text-primary">
          <Icon className="size-4" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-zinc-200 block">{label}</span>
          <span className="text-[10px] text-zinc-500">{description}</span>
        </div>
        <ArrowRight className="size-4 text-zinc-600 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
      </button>
    </Link>
  );
}
