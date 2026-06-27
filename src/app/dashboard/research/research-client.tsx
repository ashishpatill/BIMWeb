"use client";

import { useState, useTransition, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Layers,
  GitBranch,
  Loader2,
  Clock,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Info,
  FileText,
  History,
  Lightbulb,
  BookOpen,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, SegmentedTabs } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  EcosystemError,
  bimAgent,
  bimIndex,
  type AgentQueryResponse,
  type IndexSearchHit,
} from "@/lib/api-clients";
import { addSearchHistory, clearSearchHistory } from "@/lib/actions";

// ─── Types ───────────────────────────────────────────────

export interface ResearchClientProps {
  ecosystemHealth: Record<string, { status: string; ok: boolean }>;
  searchHistory: Array<{
    id: number;
    userId: string;
    query: string;
    mode: string;
    createdAt: Date | null;
  }>;
}

type ResearchMode = "smart" | "keyword" | "semantic" | "relationships";

const MODE_TABS: { value: ResearchMode; label: string }[] = [
  { value: "smart", label: "Smart (Recommended)" },
  { value: "keyword", label: "Keyword" },
  { value: "semantic", label: "Semantic" },
  { value: "relationships", label: "Relationships" },
];

const MODE_LABELS: Record<ResearchMode, string> = {
  smart: "Smart",
  keyword: "Keyword",
  semantic: "Semantic",
  relationships: "Relationships",
};

const EXAMPLE_QUERIES = [
  "What fire rating is required for floor 3?",
  "Show specs for curtain wall glazing",
  "Summarize the structural report",
];

// ─── Helpers ─────────────────────────────────────────────

function getHitTitle(hit: IndexSearchHit): string {
  return String(
    hit.title ?? hit.name ?? hit.id ?? hit.content ?? "Search result",
  );
}

function getHitSnippet(hit: IndexSearchHit): string {
  const snippet =
    hit.snippet ?? hit.excerpt ?? hit.summary ?? hit.content ?? hit.text;
  if (snippet && typeof snippet === "string") return snippet.slice(0, 300);
  return "";
}

function getHitScore(hit: IndexSearchHit): number | null {
  const score = hit.score ?? hit.relevance ?? hit.confidence ?? null;
  if (score != null) return Number(score);
  return null;
}

function getHitSource(hit: IndexSearchHit): string {
  return String(hit.source ?? hit.backend ?? hit.document_type ?? "index");
}

function getHitUrl(hit: IndexSearchHit): string | null {
  return hit.url || hit.link || hit.model_url
    ? String(hit.url ?? hit.link ?? hit.model_url ?? "")
    : null;
}

function getHitModelLink(hit: IndexSearchHit): string | null {
  const modelId = hit.model_id;
  const elementId = hit.element_id;
  if (modelId && elementId) {
    return `/dashboard/projects/0/models/${modelId}?element=${elementId}`;
  }
  if (modelId) {
    return `/dashboard/projects/0/models/${modelId}`;
  }
  return null;
}

function buildTraceTimeline(
  trace: Record<string, unknown>,
): { icon: string; text: string }[] {
  const steps: { icon: string; text: string }[] = [];

  // If trace has a known "steps" array, render each
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
          const modeLabel = mode
            ? MODE_LABELS[mode as ResearchMode] ?? mode
            : "the index";
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
        } else if (type.includes("graph")) {
          steps.push({ icon: "git-branch", text: "Queried relationship graph" });
        } else if (type.includes("rerank") || type.includes("rank")) {
          steps.push({ icon: "layers", text: "Re-ranked results by relevance" });
        } else if (type.includes("filter")) {
          steps.push({ icon: "filter", text: "Filtered results by criteria" });
        } else {
          steps.push({ icon: "info", text: String(s.description ?? s.message ?? type) });
        }
      }
    }
  } else {
    // Flat trace — deduce what happened from keys
    const vectorless = trace.vectorless_hits ?? trace.keyword_hits;
    const dense = trace.dense_hits ?? trace.semantic_hits;
    const graph = trace.graph_hits;

    if (vectorless != null) {
      steps.push({
        icon: "search",
        text: `Searched the keyword index → ${vectorless} hits`,
      });
    }
    if (dense != null) {
      steps.push({
        icon: "layers",
        text: `Searched the semantic index → ${dense} hits`,
      });
    }
    if (graph != null) {
      steps.push({
        icon: "git-branch",
        text: `Searched the relationship graph → ${graph} hits`,
      });
    }

    const sources = trace.sources ?? trace.documents ?? null;
    if (Array.isArray(sources) && sources.length > 0) {
      steps.push({
        icon: "file",
        text: `Retrieved ${sources.length} supporting sources`,
      });
    }

    // Always end with a synthesis step if there was any search
    if (steps.length > 0) {
      steps.push({
        icon: "sparkles",
        text: `Synthesized final answer`,
      });
    }
  }

  // If we still have nothing, show a single descriptive step
  if (steps.length === 0) {
    const keys = Object.keys(trace);
    if (keys.length > 0) {
      steps.push({
        icon: "info",
        text: `Processed query through ${keys.length} stages`,
      });
    }
    steps.push({
      icon: "sparkles",
      text: "Generated response",
    });
  }

  return steps;
}

function getTraceSources(
  trace: Record<string, unknown>,
): IndexSearchHit[] {
  const raw = trace.sources ?? trace.documents ?? trace.results ?? [];
  if (Array.isArray(raw)) return raw as IndexSearchHit[];
  return [];
}

function getConnectionStatus(
  health: Record<string, { status: string; ok: boolean }>,
): { offline: boolean; degraded: boolean } {
  const agent = health.BIMAgent;
  const index = health.BIMIndex;
  const agentOk = agent?.ok ?? false;
  const indexOk = index?.ok ?? false;
  const agentStatus = agent?.status ?? "unreachable";
  const indexStatus = index?.status ?? "unreachable";
  const offline =
    agentStatus === "unreachable" || indexStatus === "unreachable";
  const degraded =
    !offline && (!agentOk || !indexOk);
  return { offline, degraded };
}

// ─── Icons for trace steps ───────────────────────────────

function StepIcon({ icon }: { icon: string }) {
  const className = "size-4 shrink-0";
  switch (icon) {
    case "search":
      return <Search className={`${className} text-blue-400`} />;
    case "file":
      return <FileText className={`${className} text-amber-400`} />;
    case "sparkles":
      return <Sparkles className={`${className} text-violet-400`} />;
    case "git-branch":
      return <GitBranch className={`${className} text-emerald-400`} />;
    case "layers":
      return <Layers className={`${className} text-cyan-400`} />;
    case "info":
      return <Info className={`${className} text-zinc-400`} />;
    default:
      return <ChevronRight className={`${className} text-zinc-500`} />;
  }
}

// ─── Connection Banner ───────────────────────────────────

function ConnectionBanner({ offline, degraded }: { offline: boolean; degraded: boolean }) {
  if (!offline && !degraded) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
      <div>
        <p className="font-medium text-amber-300">
          {offline
            ? "Search backend offline"
            : "Search backend degraded"}
        </p>
        <p className="mt-0.5 text-amber-200/80">
          {offline
            ? "Start the platform with "
            : "Some search features may be unavailable. "}
          <code className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-mono text-amber-200">
            ./start-platform.sh
          </code>
          {!offline && " to restore full functionality."}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Source Card ─────────────────────────────────────────

function SourceCard({ hit }: { hit: IndexSearchHit }) {
  const title = getHitTitle(hit);
  const snippet = getHitSnippet(hit);
  const score = getHitScore(hit);
  const source = getHitSource(hit);
  const url = getHitUrl(hit);
  const modelLink = getHitModelLink(hit);
  const [expanded, setExpanded] = useState(false);

  // Extra fields for the "Details" expandable
  const knownKeys = new Set([
    "title", "name", "id", "content", "text", "snippet", "excerpt",
    "summary", "score", "relevance", "confidence", "source", "backend",
    "document_type", "url", "link", "model_url", "model_id", "element_id",
  ]);
  const extraFields = Object.entries(hit).filter(
    ([k]) => !knownKeys.has(k),
  );

  return (
    <Card className="border-white/5 bg-white/[0.03] transition-colors hover:border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileText className="size-4 shrink-0 text-primary" />
              <p className="truncate text-sm font-medium text-zinc-200">
                {title}
              </p>
            </div>
            {snippet && (
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 line-clamp-3">
                {snippet}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {score != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                  {(score * 100).toFixed(0)}% match
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[11px] text-zinc-400">
                {source}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
              {url && (
              <Tooltip>
                <TooltipTrigger>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                    aria-label="Open source"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Open source</TooltipContent>
              </Tooltip>
            )}
            {modelLink && (
              <Tooltip>
                <TooltipTrigger>
                  <a
                    href={modelLink}
                    className="inline-flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                    aria-label="Show on model"
                  >
                    <Eye className="size-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Show on model</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Extra fields expandable */}
        {extraFields.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              {expanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              Details ({extraFields.length})
            </button>
            {expanded && (
              <div className="mt-1 space-y-0.5 rounded-md bg-black/20 p-2">
                {extraFields.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-start gap-2 text-[11px]"
                  >
                    <span className="shrink-0 font-mono text-zinc-500">
                      {k}:
                    </span>
                    <span className="break-all text-zinc-400">
                      {typeof v === "object"
                        ? JSON.stringify(v)
                        : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Trace Timeline ──────────────────────────────────────

function TraceTimeline({ trace }: { trace: Record<string, unknown> }) {
  const steps = buildTraceTimeline(trace);

  return (
    <div className="relative space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3 pb-3 last:pb-0">
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="absolute left-[7px] top-4 h-full w-px bg-white/5" />
          )}
          <div className="relative z-10 mt-0.5">
            <StepIcon icon={step.icon} />
          </div>
          <p className="text-xs leading-relaxed text-zinc-300">{step.text}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export function ResearchClient({
  ecosystemHealth,
  searchHistory: initialHistory,
}: ResearchClientProps) {
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const modeParam = searchParams.get("mode") as ResearchMode | null;
  const currentMode: ResearchMode = modeParam ?? "smart";

  const [query, setQuery] = useState("");
  const [agentResult, setAgentResult] = useState<AgentQueryResponse | null>(
    null,
  );
  const [indexHits, setIndexHits] = useState<IndexSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [traceOpen, setTraceOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { offline, degraded } = getConnectionStatus(ecosystemHealth);

  // Track which modes might be unavailable
  const agentAvailable = ecosystemHealth.BIMAgent?.ok ?? false;
  const indexAvailable = ecosystemHealth.BIMIndex?.ok ?? false;
  const smartUnavailable = currentMode === "smart" && !agentAvailable;
  const indexUnavailable =
    currentMode !== "smart" && !indexAvailable;
  const anySearchDisabled = offline;
  const partialFailure =
    hasSearched && !isSearching && !error && (
      (currentMode === "smart" && !agentResult) ||
      (currentMode !== "smart" && indexHits.length === 0 && hasSearched)
    );

  const doSmartSearch = useCallback(
    async (q: string) => {
      const result = await bimAgent.query(q);
      return result;
    },
    [],
  );

  const doIndexSearch = useCallback(
    async (q: string, mode: ResearchMode) => {
      const retrievalMode =
        mode === "keyword"
          ? "vectorless"
          : mode === "semantic"
            ? "dense"
            : "graph";
      const hits = await bimIndex.search(q, retrievalMode);
      return hits;
    },
    [],
  );

  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      if (!q) return;

      setError(null);
      setAgentResult(null);
      setIndexHits([]);
      setHasSearched(false);
      setIsSearching(true);
      setTraceOpen(false);

      startTransition(async () => {
        try {
          let agentResponse: AgentQueryResponse | null = null;
          let indexResponse: IndexSearchHit[] = [];

          if (currentMode === "smart") {
            agentResponse = await doSmartSearch(q);
          } else {
            indexResponse = await doIndexSearch(q, currentMode);
          }

          setAgentResult(agentResponse);
          setIndexHits(indexResponse);
          setHasSearched(true);

          // Save to history
          const saveResult = await addSearchHistory(q, currentMode);
          if (!saveResult.success) {
            toast.error(saveResult.error || "Failed to save search history");
          }

          // Refresh history
          // We can't call getSearchHistory from client directly, so we
          // optimistically prepend to local state
          setHistory((prev) => {
            const exists = prev.some((h) => h.query === q);
            if (exists) return prev;
            return [
              {
                id: Date.now(),
                userId: "",
                query: q,
                mode: currentMode,
                createdAt: new Date(),
              },
              ...prev,
            ];
          });
        } catch (err) {
          if (err instanceof EcosystemError) {
            const msg =
              err.status === 0
                ? `${err.service} is not reachable. Make sure the platform is running.`
                : `${err.service} returned an error (${err.status}). Please try again.`;
            setError(msg);
            toast.error(msg);
          } else {
            const msg =
              err instanceof Error
                ? err.message
                : "An unexpected error occurred";
            setError(msg);
            toast.error(msg);
          }
          setHasSearched(true);
        } finally {
          setIsSearching(false);
        }
      });
    },
    [query, currentMode, doSmartSearch, doIndexSearch, startTransition],
  );

  const handleClearHistory = useCallback(async () => {
    const result = await clearSearchHistory();
    if (result.success) {
      setHistory([]);
      toast.success("Search history cleared");
    } else {
      toast.error(result.error || "Failed to clear search history");
    }
  }, []);

  const handleReRun = useCallback(
    (q: string) => {
      setQuery(q);
      // We need to trigger search with this query
      setError(null);
      setAgentResult(null);
      setIndexHits([]);
      setHasSearched(false);
      setIsSearching(true);
      setTraceOpen(false);

      startTransition(async () => {
        try {
          let agentResponse: AgentQueryResponse | null = null;
          let indexResponse: IndexSearchHit[] = [];

          if (currentMode === "smart") {
            agentResponse = await doSmartSearch(q);
          } else {
            indexResponse = await doIndexSearch(q, currentMode);
          }

          setAgentResult(agentResponse);
          setIndexHits(indexResponse);
          setHasSearched(true);
        } catch (err) {
          if (err instanceof EcosystemError) {
            const msg =
              err.status === 0
                ? `${err.service} is not reachable. Make sure the platform is running.`
                : `${err.service} returned an error (${err.status}). Please try again.`;
            setError(msg);
            toast.error(msg);
          } else {
            const msg =
              err instanceof Error
                ? err.message
                : "An unexpected error occurred";
            setError(msg);
            toast.error(msg);
          }
          setHasSearched(true);
        } finally {
          setIsSearching(false);
        }
      });
    },
    [currentMode, doSmartSearch, doIndexSearch, startTransition],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSearch();
    },
    [handleSearch],
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      setQuery(example);
      // Search on next tick so state updates
      setTimeout(() => {
        setError(null);
        setAgentResult(null);
        setIndexHits([]);
        setHasSearched(false);
        setIsSearching(true);
        setTraceOpen(false);

        startTransition(async () => {
          try {
            let agentResponse: AgentQueryResponse | null = null;
            let indexResponse: IndexSearchHit[] = [];

            if (currentMode === "smart") {
              agentResponse = await doSmartSearch(example);
            } else {
              indexResponse = await doIndexSearch(example, currentMode);
            }

            setAgentResult(agentResponse);
            setIndexHits(indexResponse);
            setHasSearched(true);

            const saveResult = await addSearchHistory(example, currentMode);
            if (!saveResult.success) {
              toast.error(saveResult.error || "Failed to save search history");
            }

            setHistory((prev) => {
              const exists = prev.some((h) => h.query === example);
              if (exists) return prev;
              return [
                {
                  id: Date.now(),
                  userId: "",
                  query: example,
                  mode: currentMode,
                  createdAt: new Date(),
                },
                ...prev,
              ];
            });
          } catch (err) {
            if (err instanceof EcosystemError) {
              const msg =
                err.status === 0
                  ? `${err.service} is not reachable. Make sure the platform is running.`
                  : `${err.service} returned an error (${err.status}). Please try again.`;
              setError(msg);
              toast.error(msg);
            } else {
              const msg =
                err instanceof Error
                  ? err.message
                  : "An unexpected error occurred";
              setError(msg);
              toast.error(msg);
            }
            setHasSearched(true);
          } finally {
            setIsSearching(false);
          }
        });
      }, 0);
    },
    [currentMode, doSmartSearch, doIndexSearch, startTransition],
  );

  // Derive sources from trace
  const traceSources = agentResult?.trace
    ? getTraceSources(agentResult.trace)
    : [];

  // Check for empty results
  const noResults =
    hasSearched &&
    !isSearching &&
    !error &&
    ((currentMode === "smart" && !agentResult) ||
      (currentMode !== "smart" && indexHits.length === 0));

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Research"
        description="Ask questions across your BIM documents and models."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Research" },
        ]}
      />

      <ConnectionBanner offline={offline} degraded={degraded} />

      <div className="flex gap-6">
        {/* ─── Main Content ─────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Search form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Ask a research question..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={anySearchDisabled}
                className="border-white/10 bg-white/5 pl-10 text-zinc-100 placeholder:text-zinc-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                aria-label="Research query"
              />
            </div>

            {/* Example chips (shown when no search performed yet) */}
            {!hasSearched && !isSearching && (
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    disabled={anySearchDisabled}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-primary/30 hover:text-zinc-200"
                  >
                    <Lightbulb className="size-3" />
                    {example}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              {/* Mode selector */}
              <SegmentedTabs
                tabs={MODE_TABS}
                searchParam="mode"
                className="[&>div]:flex-wrap"
              />

              <Button
                type="submit"
                disabled={isSearching || !query.trim() || anySearchDisabled}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="mr-1.5 size-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Warning when current mode backend is down */}
          {smartUnavailable && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Smart Search requires BIMAgent, which is currently offline.
                Switch to Keyword or Semantic search.
              </span>
            </div>
          )}
          {indexUnavailable && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                BIMIndex is currently offline. Switch to Smart Search.
              </span>
            </div>
          )}

          {/* Partial failure note */}
          {partialFailure && (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20 px-3 py-2 text-xs text-zinc-400">
              Some search modes did not return results. Try a different query or
              mode.
            </div>
          )}

          {/* ─── Loading ──────────────────────────── */}
          {isSearching && (
            <div className="space-y-3">
              <Card className="border-white/5 bg-white/[0.02]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    Searching…
                  </div>
                </CardContent>
              </Card>
              {/* Skeleton cards */}
              {[1, 2].map((i) => (
                <Card key={i} className="border-white/5 bg-white/[0.02]">
                  <CardContent className="p-4">
                    <Skeleton className="mb-2 h-4 w-3/5 bg-white/5" />
                    <Skeleton className="mb-1 h-3 w-full bg-white/5" />
                    <Skeleton className="h-3 w-4/5 bg-white/5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ─── Error ────────────────────────────── */}
          <AnimatePresence>
            {error && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-red-500/20 bg-red-500/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-300">
                      Search error
                    </p>
                    <p className="mt-1 text-xs text-red-200/80">{error}</p>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Ensure the platform services are running. Start with{" "}
                      <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-400">
                        ./start-platform.sh
                      </code>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSearch()}
                        className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        <RefreshCw className="mr-1.5 size-3.5" />
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── No Results ───────────────────────── */}
          {noResults && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <EmptyState
                icon={Search}
                title={`No results for "${query}"`}
                description="Try rephrasing your question or switching to a different search mode."
                primaryAction={{
                  label: "Try again",
                  onClick: () => handleSearch(),
                }}
              />
            </motion.div>
          )}

          {/* ─── Smart Answer ─────────────────────── */}
          {currentMode === "smart" && agentResult && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Answer */}
              <Card className="border-primary/20 bg-white/[0.02]">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold text-zinc-100">
                      Answer
                    </h2>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                    {agentResult.response}
                  </p>

                  {/* How this answer was built */}
                  {agentResult.trace &&
                    Object.keys(agentResult.trace).length > 0 && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setTraceOpen(!traceOpen)}
                          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          {traceOpen ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                          How this answer was built
                        </button>
                        {traceOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="mt-3 rounded-lg border border-white/5 bg-black/20 p-4"
                          >
                            <TraceTimeline trace={agentResult.trace} />
                          </motion.div>
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Sources from trace */}
              {traceSources.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    <BookOpen className="size-3.5" />
                    Sources ({traceSources.length})
                  </h3>
                  <div className="space-y-2">
                    {traceSources.map((hit, i) => (
                      <SourceCard key={i} hit={hit} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Index Results ────────────────────── */}
          {currentMode !== "smart" && indexHits.length > 0 && !isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="text-xs text-zinc-500">
                {indexHits.length} result{indexHits.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-2">
                {indexHits.map((hit, i) => (
                  <SourceCard key={i} hit={hit} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── Empty (first visit, no search) ───── */}
          {!hasSearched && !isSearching && (
            <EmptyState
              icon={Search}
              title="Ask a question to get started"
              description="Try one of the example queries above, or type your own question about your BIM documents and models."
            />
          )}
        </div>

        {/* ─── History Sidebar ────────────────────── */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <History className="size-3.5" />
                History
              </h3>
              {history.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                      aria-label="Clear history"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Clear history</TooltipContent>
                </Tooltip>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-zinc-600">
                No searches yet. Your recent queries will appear here.
              </p>
            ) : (
              <ul className="space-y-1">
                {history.slice(0, 20).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleReRun(item.query)}
                      className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-500 transition-colors hover:bg-white/[0.03] hover:text-zinc-300"
                    >
                      <Clock className="mt-0.5 size-3 shrink-0 text-zinc-600" />
                      <span className="line-clamp-2 break-all">
                        {item.query}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {history.length > 0 && (
              <Separator className="bg-white/5" />
            )}

            {/* Legend for current mode */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Info className="size-3.5" />
                {currentMode === "smart" && "Smart Search uses BIMAgent to synthesize answers across all indexes."}
                {currentMode === "keyword" && "Keyword search finds exact matches in indexed documents."}
                {currentMode === "semantic" && "Semantic search finds results by meaning, not just keywords."}
                {currentMode === "relationships" && "Relationship search explores connections in the knowledge graph."}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
