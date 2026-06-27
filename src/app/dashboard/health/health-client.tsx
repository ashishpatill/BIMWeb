"use client";

/**
 * T-PAGE-HEALTH — Platform Health interactive client.
 *
 * Renders 4 service cards, a "Start platform" callout (if offline),
 * a test-query card with trace timeline, BIMCloud metrics summary,
 * and regions list.
 */
import { useState, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Loader2,
  RefreshCw,
  Terminal,
  Zap,
  ShieldCheck,
  AlertCircle,
  Globe,
  Copy,
  Check,
  Server,
  Brain,
  FileSearch,
  Network,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ConnectionBadge, HelpCallout } from "@/components/common";
import type { ConnectionStatus } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  EcosystemError,
  bimCloud,
} from "@/lib/api-clients";
import { getEcosystemHealthForOverview } from "@/lib/actions";
import type {
  HealthPageData,
  CloudHealthDetail,
  MetricsData,
} from "./page";

// ── Props ─────────────────────────────────────────────────────────

interface HealthClientProps {
  data: HealthPageData;
}

// ── Circuit-breaker display helpers ───────────────────────────────

function circuitBreakerDisplay(
  state: string,
): { status: ConnectionStatus; label: string; explanation: string } {
  switch (state) {
    case "closed":
      return {
        status: "healthy",
        label: "Accepting requests",
        explanation:
          "The gateway is routing queries normally. All requests pass through to the backend services.",
      };
    case "open":
      return {
        status: "offline",
        label: "Open — not accepting requests",
        explanation:
          "The gateway detected repeated failures and is now blocking requests to protect backend services. This usually means BIMAgent or another downstream service is unavailable. Start the affected service, then the circuit breaker will automatically reset.",
      };
    case "half-open":
      return {
        status: "degraded",
        label: "Protected — retrying shortly",
        explanation:
          "After a failure period, the gateway is testing whether services have recovered. A limited number of test requests are being let through. If they succeed, the circuit will close automatically.",
      };
    default:
      return {
        status: "unknown",
        label: state,
        explanation: `The circuit breaker is in an unknown state: "${state}".`,
      };
  }
}

function healthToConnectionStatus(
  ok: boolean,
  status: string,
): ConnectionStatus {
  if (ok) return "healthy";
  if (status === "unreachable") return "offline";
  return "degraded";
}

// ── Format helpers ────────────────────────────────────────────────

function formatLatency(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Trace timeline builder (plain language) ───────────────────────

function buildHealthTraceTimeline(
  result: Record<string, unknown>,
): { icon: string; text: string }[] {
  const steps: { icon: string; text: string }[] = [];

  // If the result contains a query field, show it
  if (typeof result.query === "string") {
    steps.push({ icon: "search", text: `Received query: "${result.query}"` });
  }

  // Check for trace object
  const trace = result.trace as Record<string, unknown> | undefined;
  if (trace) {
    // If trace has a steps array, render each
    const traceSteps = trace.steps;
    if (Array.isArray(traceSteps) && traceSteps.length > 0) {
      for (const step of traceSteps) {
        if (typeof step === "object" && step !== null) {
          const s = step as Record<string, unknown>;
          const type = String(s.type ?? s.action ?? s.step ?? "step");
          const mode = s.mode ? String(s.mode) : null;
          const count = s.results ?? s.count ?? s.hits ?? null;

          if (type.includes("query") || type.includes("analyze")) {
            steps.push({ icon: "search", text: "Analyzed your question" });
          } else if (type.includes("retriev") || type.includes("search")) {
            const modeLabel = mode ?? "the index";
            const countText =
              count != null ? ` → ${count} results found` : "";
            steps.push({
              icon: "file",
              text: `Searched ${modeLabel}${countText}`,
            });
          } else if (type.includes("synthes") || type.includes("answer")) {
            const srcs = s.sources ?? s.source_count ?? null;
            const srcText =
              srcs != null ? ` from ${srcs} sources` : "";
            steps.push({
              icon: "sparkles",
              text: `Synthesized answer${srcText}`,
            });
          } else if (type.includes("gateway") || type.includes("route")) {
            steps.push({
              icon: "network",
              text: "Routed through edge gateway",
            });
          } else if (type.includes("graph")) {
            steps.push({
              icon: "git-branch",
              text: "Queried relationship graph",
            });
          } else {
            steps.push({
              icon: "info",
              text: String(s.description ?? s.message ?? type),
            });
          }
        }
      }
    } else {
      // Flat trace — deduce steps from keys
      const modes = ["vectorless", "dense", "graph"];
      for (const mode of modes) {
        const keyVariants = [
          `${mode}_hits`,
          `${mode}_results`,
          `${mode}_count`,
        ];
        let found = false;
        for (const key of keyVariants) {
          const val = trace[key];
          if (val != null) {
            const label =
              mode === "vectorless"
                ? "Quick keyword"
                : mode === "dense"
                  ? "Semantic"
                  : "Relationships";
            steps.push({
              icon: mode === "vectorless" ? "search" : mode === "dense" ? "layers" : "git-branch",
              text: `Searched ${label} index → ${val} hits`,
            });
            found = true;
            break;
          }
        }
        // Also check shorter keys
        if (!found) {
          const val = trace[mode];
          if (val != null) {
            const label =
              mode === "vectorless"
                ? "Quick keyword"
                : mode === "dense"
                  ? "Semantic"
                  : "Relationships";
            steps.push({
              icon: mode === "vectorless" ? "search" : mode === "dense" ? "layers" : "git-branch",
              text: `Searched ${label} index → ${val} hits`,
            });
          }
        }
      }

      // Check for sources
      const sources = trace.sources ?? trace.documents ?? null;
      if (Array.isArray(sources) && sources.length > 0) {
        steps.push({
          icon: "file",
          text: `Retrieved ${sources.length} supporting sources`,
        });
      }
    }
  }

  // Add the response text as a final step
  if (typeof result.response === "string" && result.response.length > 0) {
    steps.push({ icon: "sparkles", text: "Generated final response" });
  }

  // If we still have nothing, show a generic step
  if (steps.length === 0) {
    steps.push({
      icon: "activity",
      text: "Query processed successfully through gateway",
    });
  }

  return steps;
}

function getAnswerText(result: Record<string, unknown> | null): string {
  if (!result) return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.answer === "string") return result.answer;
  if (typeof result.text === "string") return result.text;
  if (typeof result.content === "string") return result.content;
  return "";
}

// ── Sub-components ───────────────────────────────────────────────

function StepIcon({ icon }: { icon: string }) {
  const className = "size-4 shrink-0";
  switch (icon) {
    case "search":
      return <Activity className={`${className} text-blue-400`} />;
    case "file":
      return <FileSearch className={`${className} text-amber-400`} />;
    case "sparkles":
      return <Zap className={`${className} text-violet-400`} />;
    case "network":
      return <Network className={`${className} text-cyan-400`} />;
    case "git-branch":
      return <Network className={`${className} text-emerald-400`} />;
    case "layers":
      return <Activity className={`${className} text-cyan-400`} />;
    case "info":
      return <AlertCircle className={`${className} text-zinc-400`} />;
    default:
      return <Activity className={`${className} text-zinc-400`} />;
  }
}

// ── Service Card ──────────────────────────────────────────────────

interface ServiceCardProps {
  title: string;
  icon: React.ReactNode;
  status: ConnectionStatus;
  statusLabel: string;
  subStatus: React.ReactNode;
  latency?: string | null;
  error?: string | null;
}

function ServiceCard({
  title,
  icon,
  status,
  statusLabel,
  subStatus,
  latency,
  error,
}: ServiceCardProps) {
  return (
    <Card className="glass-panel border border-white/5 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <ConnectionBadge status={status} label={statusLabel} />
            </div>
          </div>
          {latency && (
            <Tooltip>
              <TooltipTrigger>
                <span className="text-xs text-zinc-500">{latency}</span>
              </TooltipTrigger>
              <TooltipContent side="top">Response time</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-xs text-zinc-400 mt-2">{subStatus}</div>
        {error && (
          <p className="text-xs text-amber-400 mt-2 truncate" title={error}>
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Metric Bar ────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  maxValue,
  unit,
}: {
  label: string;
  value: number;
  maxValue: number;
  unit: string;
}) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-xs text-zinc-400 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 text-right text-xs text-zinc-300 font-mono">
        {value} {unit}
      </span>
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────

export function HealthClient({ data }: HealthClientProps) {
  // ── State ──────────────────────────────────────────────────────
  const [ecosystem, setEcosystem] = useState(data.ecosystem);
  const [cloud, setCloud] = useState<CloudHealthDetail | null>(data.cloud);
  const [cloudError, setCloudError] = useState<string | null>(data.cloudError);
  const [skillsCount] = useState<number | null>(data.skillsCount);
  const [metrics] = useState<MetricsData | null>(data.metrics);
  const [metricsError] = useState<string | null>(data.metricsError);

  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<{
    result: Record<string, unknown> | null;
    trace_id: string;
    latency_ms: number | null;
    status: string;
  } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // For copy button
  const [copied, setCopied] = useState(false);

  // ── Derived state ──────────────────────────────────────────────
  const anyOffline = Object.values(ecosystem).some(
    (s) => s.status === "unreachable" || (!s.ok && s.status !== "healthy"),
  );

  const circuitBreaker = cloud?.circuit_breaker ?? "unknown";
  const cbDisplay = circuitBreakerDisplay(circuitBreaker);
  const gatewayOpen = circuitBreaker === "open";

  // ── Refresh handler ───────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const eco = await getEcosystemHealthForOverview();
      setEcosystem(eco as Record<string, { status: string; ok: boolean }>);
      try {
        const c = await bimCloud.health();
        setCloud({ ...c });
        setCloudError(null);
      } catch (err) {
        setCloud(null);
        setCloudError(
          err instanceof EcosystemError ? err.message : (err as Error).message,
        );
      }
      toast.success("Health refreshed");
    } catch {
      toast.error("Failed to refresh health data");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ── Test-query handler ─────────────────────────────────────────
  const handleRouteQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setQueryResult(null);
    setQueryError(null);
    startTransition(async () => {
      try {
        const res = await bimCloud.routeQuery(query.trim());
        setQueryResult(res);
        toast.success("Query routed successfully");
      } catch (err) {
        const msg =
          err instanceof EcosystemError
            ? err.message
            : (err as Error).message;
        setQueryError(msg);
        toast.error(msg);
      }
    });
  };

  // ── Copy handler ───────────────────────────────────────────────
  const copyStartCommand = async () => {
    try {
      await navigator.clipboard.writeText("./start-platform.sh");
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // ── Circuit breaker explanation ────────────────────────────────
  const breakerOk = circuitBreaker === "closed";

  // ── Trace timeline from result ─────────────────────────────────
  const resultObj = queryResult?.result ?? null;
  const traceSteps = resultObj ? buildHealthTraceTimeline(resultObj) : [];
  const answerText = resultObj ? getAnswerText(resultObj) : "";

  // ── Regions ────────────────────────────────────────────────────
  const regions = cloud?.region
    ? Array.isArray(cloud.region)
      ? cloud.region
      : [cloud.region]
    : null;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Page header */}
      <PageHeader
        title="Platform Health"
        description="Status of the BIMRAG services powering your workspace."
        breadcrumbs={[{ label: "Platform Health" }]}
        primaryAction={
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="ghost"
            className="rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
        }
      />

      {/* Offline banner — "Start platform" callout */}
      {anyOffline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-panel rounded-2xl p-5 flex items-start gap-4 ${
            gatewayOpen
              ? "border-red-500/20 bg-red-500/5"
              : "border-amber-500/20 bg-amber-500/5"
          }`}
        >
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              gatewayOpen
                ? "bg-red-500/10 text-red-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            <Terminal className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {gatewayOpen
                ? "Gateway is protecting services"
                : "Some services are offline"}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              {gatewayOpen
                ? cbDisplay.explanation
                : "Start the platform services to restore full functionality."}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <code className="rounded-lg bg-black/40 px-3 py-1.5 text-sm font-mono text-emerald-400 border border-white/5">
                ./start-platform.sh
              </code>
              <Tooltip>
                <TooltipTrigger>
                  <button
                    type="button"
                    onClick={copyStartCommand}
                    aria-label="Copy start command"
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Copy command</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4 Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BIMAgent */}
        <ServiceCard
          title="BIMAgent"
          icon={<Brain className="size-5 text-primary" />}
          status={healthToConnectionStatus(
            ecosystem.BIMAgent?.ok ?? false,
            ecosystem.BIMAgent?.status ?? "unreachable",
          )}
          statusLabel={
            ecosystem.BIMAgent?.ok
              ? "Healthy"
              : ecosystem.BIMAgent?.status === "unreachable"
                ? "Offline"
                : "Degraded"
          }
          subStatus={
            <span>
              {ecosystem.BIMAgent?.ok
                ? "Answer engine — ready for queries"
                : "Not responding to health checks"}
            </span>
          }
          error={ecosystem.BIMAgent?.status === "unreachable" ? null : undefined}
        />

        {/* BIMIndex */}
        <ServiceCard
          title="BIMIndex"
          icon={<Server className="size-5 text-primary" />}
          status={healthToConnectionStatus(
            ecosystem.BIMIndex?.ok ?? false,
            ecosystem.BIMIndex?.status ?? "unreachable",
          )}
          statusLabel={
            ecosystem.BIMIndex?.ok
              ? "Healthy"
              : ecosystem.BIMIndex?.status === "unreachable"
                ? "Offline"
                : "Degraded"
          }
          subStatus={
            ecosystem.BIMIndex?.ok ? (
              <span className="text-zinc-400">
                Modes available:{" "}
                <span className="text-zinc-300">Keyword, Semantic, Relationships</span>
              </span>
            ) : (
              <span className="text-zinc-500">Index not reachable</span>
            )
          }
        />

        {/* BIMExtract */}
        <ServiceCard
          title="BIMExtract"
          icon={<FileSearch className="size-5 text-primary" />}
          status={healthToConnectionStatus(
            ecosystem.BIMExtract?.ok ?? false,
            ecosystem.BIMExtract?.status ?? "unreachable",
          )}
          statusLabel={
            ecosystem.BIMExtract?.ok
              ? "Healthy"
              : ecosystem.BIMExtract?.status === "unreachable"
                ? "Offline"
                : "Degraded"
          }
          subStatus={
            ecosystem.BIMExtract?.ok ? (
              <span className="text-zinc-400">
                {skillsCount != null
                  ? `${skillsCount} skill${skillsCount !== 1 ? "s" : ""} available`
                  : "Skills information unavailable"}
              </span>
            ) : (
              <span className="text-zinc-500">Extraction engine not reachable</span>
            )
          }
        />

        {/* BIMCloud */}
        <ServiceCard
          title="BIMCloud"
          icon={<Network className="size-5 text-primary" />}
          status={
            cloud
              ? breakerOk
                ? "healthy"
                : circuitBreaker === "half-open"
                  ? "degraded"
                  : "offline"
              : "unknown"
          }
          statusLabel={cloud ? cbDisplay.label : "Unknown"}
          subStatus={
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Circuit breaker:</span>
                <span
                  className={`text-xs font-medium ${
                    breakerOk
                      ? "text-emerald-400"
                      : circuitBreaker === "half-open"
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {cbDisplay.label}
                </span>
                <HelpCallout
                  label="Circuit breaker info"
                  content={
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {cbDisplay.explanation}
                    </p>
                  }
                />
              </div>
              {regions && regions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Globe className="size-3 text-zinc-500" />
                  <span className="text-zinc-500">Region{regions.length > 1 ? "s" : ""}:</span>
                  <span className="text-zinc-300">{regions.join(", ")}</span>
                </div>
              )}
            </div>
          }
          error={cloudError}
        />
      </div>

      {/* Metrics summary card */}
      <Card className="glass-panel border border-white/5 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <CardTitle className="text-sm font-semibold text-white">
              BIMCloud Metrics
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {metrics ? (
            <div className="space-y-3">
              <MetricBar
                label="Total requests"
                value={metrics.totalRequests}
                maxValue={metrics.totalRequests || 1}
                unit=""
              />
              <MetricBar
                label="Error rate"
                value={metrics.errorRate != null ? Math.round(metrics.errorRate * 10000) / 100 : 0}
                maxValue={100}
                unit="%"
              />
              <MetricBar
                label="p95 latency"
                value={metrics.p95LatencyMs != null ? Math.round(metrics.p95LatencyMs) : 0}
                maxValue={metrics.p95LatencyMs != null ? Math.round(metrics.p95LatencyMs * 2) : 1}
                unit="ms"
              />
              <div className="flex items-center gap-4 pt-1 text-xs text-zinc-500">
                <span>Total: {formatNumber(metrics.totalRequests)}</span>
                <span>
                  Errors:{" "}
                  {metrics.errorRate != null
                    ? formatPercent(metrics.errorRate)
                    : "—"}
                </span>
                <span>
                  p95:{" "}
                  {metrics.p95LatencyMs != null
                    ? `${Math.round(metrics.p95LatencyMs)} ms`
                    : "—"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <AlertCircle className="size-4 text-zinc-600" />
              <span>
                Metrics unavailable
                {metricsError ? ` — ${metricsError}` : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test query card */}
      <Card className="glass-panel border border-white/5 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-white">Test query</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Send a query through the BIMCloud gateway to test end-to-end routing.
            Results include a plain-language trace, trace ID, and latency.
          </p>
          <form onSubmit={handleRouteQuery} className="flex gap-3 max-w-2xl">
            <Input
              placeholder="Enter a test query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
              aria-label="Test query input"
            />
            <Button
              type="submit"
              disabled={isPending || !query.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center gap-2 px-6"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Routing...
                </>
              ) : (
                "Run through gateway"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Circuit-breaker open plain explanation */}
      {gatewayOpen && !anyOffline && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel border border-red-500/20 bg-red-500/5 rounded-2xl p-4 flex items-start gap-3"
        >
          <ShieldCheck className="size-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              Gateway is protecting services
            </p>
            <p className="text-sm text-red-400/80 mt-1">
              {cbDisplay.explanation}
            </p>
          </div>
        </motion.div>
      )}

      {/* Test query error */}
      <AnimatePresence>
        {queryError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-panel border border-red-500/20 bg-red-500/5 rounded-2xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="size-5 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-300">
                Routing failed
              </p>
              <p className="text-sm text-red-400/80 mt-1 break-words">
                {queryError}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQueryError(null);
                  // Re-trigger submit
                  if (query.trim()) {
                    startTransition(async () => {
                      try {
                        const res = await bimCloud.routeQuery(query.trim());
                        setQueryResult(res);
                        toast.success("Query routed successfully");
                      } catch (err) {
                        const msg =
                          err instanceof EcosystemError
                            ? err.message
                            : (err as Error).message;
                        setQueryError(msg);
                      }
                    });
                  }
                }}
                className="mt-2 text-xs text-zinc-400 hover:text-white"
              >
                <RefreshCw className="size-3 mr-1" />
                Retry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test query result */}
      <AnimatePresence>
        {queryResult && !queryError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="glass-panel border border-white/5 rounded-2xl">
              <CardContent className="p-6 space-y-4">
                {/* Status bar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        queryResult.status === "ok" ||
                        queryResult.status === "healthy"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          queryResult.status === "ok" ||
                          queryResult.status === "healthy"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {queryResult.status}
                    </span>
                    {queryResult.trace_id && (
                      <span className="text-xs text-zinc-500">
                        trace:{" "}
                        <code className="text-primary text-[10px]">
                          {queryResult.trace_id}
                        </code>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {queryResult.latency_ms != null && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="font-mono">
                            {formatLatency(queryResult.latency_ms)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">Response time</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Answer */}
                {answerText && (
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                    <p className="text-sm font-medium text-zinc-200 mb-2">
                      Answer
                    </p>
                    <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {answerText}
                    </p>
                  </div>
                )}

                {/* Trace timeline */}
                {traceSteps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                      How this answer was built
                    </p>
                    <div className="relative pl-6 space-y-3">
                      {/* Vertical connector line */}
                      <div className="absolute left-2.5 top-1 bottom-1 w-px bg-white/5" />
                      {traceSteps.map((step, i) => (
                        <div key={i} className="relative flex items-start gap-3">
                          <div className="absolute -left-4 flex size-5 items-center justify-center rounded-full bg-zinc-900 border border-white/5">
                            <StepIcon icon={step.icon} />
                          </div>
                          <p className="text-sm text-zinc-300 pt-0.5">
                            {step.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw result if trace was empty but result has data */}
                {traceSteps.length === 0 && resultObj && !answerText && (
                  <details className="group">
                    <summary className="flex cursor-pointer items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                      <ChevronRight className="size-3 group-open:rotate-90 transition-transform" />
                      Raw response
                    </summary>
                    <pre className="mt-2 text-xs text-zinc-500 bg-black/30 rounded-xl p-4 overflow-auto max-h-72">
                      {JSON.stringify(resultObj, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regions list (standalone) */}
      {regions && regions.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Globe className="size-3.5" />
          <span>
            Active region{regions.length > 1 ? "s" : ""}:{" "}
            <span className="text-zinc-300 font-medium">
              {regions.join(", ")}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
