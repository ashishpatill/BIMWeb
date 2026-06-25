"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Sparkles, Database, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EcosystemError, bimAgent, bimIndex, type RetrievalMode, type IndexSearchHit, type AgentQueryResponse } from "@/lib/api-clients";

type SearchTab = "agent" | "index";

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("agent");
  const [mode, setMode] = useState<RetrievalMode>("vectorless");
  const [isPending, startTransition] = useTransition();

  const [agentResult, setAgentResult] = useState<AgentQueryResponse | null>(null);
  const [indexHits, setIndexHits] = useState<IndexSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setAgentResult(null);
    setIndexHits([]);

    startTransition(async () => {
      try {
        if (tab === "agent") {
          const result = await bimAgent.query(query);
          setAgentResult(result);
        } else {
          const hits = await bimIndex.search(query, mode);
          setIndexHits(hits);
        }
      } catch (err) {
        if (err instanceof EcosystemError) {
          setError(`${err.service} unreachable (${err.status || "network"}): ${err.message}`);
        } else {
          setError((err as Error).message);
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Search</h1>
        <p className="text-zinc-400">
          Query the BIMRAG ecosystem. Ask the orchestrator agent or search the tri-modal index directly.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-xl w-fit">
        <button
          onClick={() => setTab("agent")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "agent" ? "bg-primary/15 text-primary" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Ask Agent
        </button>
        <button
          onClick={() => setTab("index")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "index" ? "bg-primary/15 text-primary" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Database className="w-4 h-4" /> Direct Index
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            placeholder={tab === "agent" ? "Ask a research question..." : "Search the index..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11 bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
          />
        </div>
        {tab === "index" && (
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as RetrievalMode)}
            className="bg-white/5 border border-white/10 text-white rounded-xl px-3 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
          >
            <option value="vectorless" className="bg-zinc-950">Vectorless</option>
            <option value="dense" className="bg-zinc-950">Dense</option>
            <option value="graph" className="bg-zinc-950">Graph</option>
          </select>
        )}
        <Button
          type="submit"
          disabled={isPending || !query.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center gap-2 px-6"
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</> : "Search"}
        </Button>
      </form>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-panel border border-red-500/20 bg-red-500/5 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-300">Integration error</p>
                <p className="text-sm text-red-400/80 mt-1">{error}</p>
                <p className="text-xs text-zinc-500 mt-2">
                  Ensure the backend service is running and <code className="text-primary">NEXT_PUBLIC_*</code> URLs are set.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent result */}
      {agentResult && (
        <div className="flex flex-col gap-4">
          <Card className="glass-panel border border-white/5 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Agent Response</h2>
              </div>
              <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{agentResult.response}</p>
            </CardContent>
          </Card>
          {agentResult.trace && Object.keys(agentResult.trace).length > 0 && (
            <Card className="glass-panel border border-white/5 rounded-2xl">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Trace</h3>
                <pre className="text-xs text-zinc-400 bg-black/30 rounded-xl p-4 overflow-auto max-h-64">
                  {JSON.stringify(agentResult.trace, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Index hits */}
      {indexHits.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-400">{indexHits.length} result{indexHits.length === 1 ? "" : "s"} from BIMIndex</p>
          {indexHits.map((hit, i) => (
            <Card key={i} className="glass-panel border border-white/5 rounded-2xl hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">
                    {String(hit.content ?? hit.text ?? hit.id ?? `Result ${i + 1}`)}
                  </p>
                  <pre className="text-xs text-zinc-500 mt-2 bg-black/20 rounded-lg p-3 overflow-auto max-h-40">
                    {JSON.stringify(hit, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!agentResult && indexHits.length === 0 && !error && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-10 h-64 flex flex-col items-center justify-center text-center gap-4 border border-white/5 rounded-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <Search className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Search the ecosystem</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              {tab === "agent"
                ? "Ask the orchestrator a question and it will route across all three retrieval modes."
                : "Run a direct query against the BIMIndex tri-modal index."}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
