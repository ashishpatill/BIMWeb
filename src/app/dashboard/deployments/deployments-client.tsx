"use client";

import { useState, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Loader2, RefreshCw, Activity, ShieldCheck, AlertCircle, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EcosystemError, bimCloud, type CloudQueryResponse } from "@/lib/api-clients";

interface HealthState {
  gateway: string;
  agent: string;
  circuit_breaker: string;
}

interface DeploymentsClientProps {
  initialHealth: HealthState | null;
  initialHealthError: string | null;
}

export function DeploymentsClient({ initialHealth, initialHealthError }: DeploymentsClientProps) {
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState<HealthState | null>(initialHealth);
  const [healthError, setHealthError] = useState<string | null>(initialHealthError);
  const [healthLoading, setHealthLoading] = useState(false);

  const [result, setResult] = useState<CloudQueryResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const h = await bimCloud.health();
      setHealth(h);
    } catch (err) {
      setHealthError(err instanceof EcosystemError ? err.message : (err as Error).message);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const handleRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setResult(null);
    setRouteError(null);
    startTransition(async () => {
      try {
        const res = await bimCloud.routeQuery(query);
        setResult(res);
      } catch (err) {
        setRouteError(err instanceof EcosystemError ? err.message : (err as Error).message);
      }
    });
  };

  const breakerState = health?.circuit_breaker ?? "unknown";
  const breakerOk = breakerState === "closed";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Deployments</h1>
          <p className="text-zinc-400">
            Edge gateway status and live query routing through BIMCloud.
          </p>
        </div>
        <Button
          onClick={refreshHealth}
          disabled={healthLoading}
          variant="ghost"
          className="rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
        >
          {healthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* Health cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthCard
          icon={<Activity className="w-5 h-5 text-primary" />}
          label="Gateway"
          value={health?.gateway ?? "—"}
          loading={healthLoading}
          ok={health?.gateway === "healthy"}
        />
        <HealthCard
          icon={<Rocket className="w-5 h-5 text-primary" />}
          label="BIMAgent"
          value={health?.agent ?? "—"}
          loading={healthLoading}
          ok={health?.agent === "healthy"}
        />
        <HealthCard
          icon={breakerOk ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
          label="Circuit Breaker"
          value={breakerState}
          loading={healthLoading}
          ok={breakerOk}
        />
      </div>

      {healthError && (
        <div className="glass-panel border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">BIMCloud health unreachable</p>
            <p className="text-sm text-amber-400/80 mt-1">{healthError}</p>
          </div>
        </div>
      )}

      {/* Route query */}
      <Card className="glass-panel border border-white/5 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white">Route a test query</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Send a query through the BIMCloud edge gateway. It forwards to BIMAgent and returns a trace id + latency.
          </p>
          <form onSubmit={handleRoute} className="flex gap-3 max-w-2xl">
            <Input
              placeholder="Enter a query to route through the gateway..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            />
            <Button
              type="submit"
              disabled={isPending || !query.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center gap-2 px-6"
            >
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Routing...</> : "Route"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Route error */}
      <AnimatePresence>
        {routeError && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-panel border border-red-500/20 bg-red-500/5 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-300">Routing failed</p>
                <p className="text-sm text-red-400/80 mt-1">{routeError}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route result */}
      {result && (
        <div className="flex flex-col gap-3">
          <Card className="glass-panel border border-white/5 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-300">Routed response</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-500">trace: <code className="text-primary">{result.trace_id}</code></span>
                  {result.latency_ms != null && (
                    <span className="text-zinc-500">{result.latency_ms.toFixed(1)} ms</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full ${result.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {result.status}
                  </span>
                </div>
              </div>
              {result.error ? (
                <p className="text-sm text-amber-400">{result.error}</p>
              ) : (
                <pre className="text-xs text-zinc-400 bg-black/30 rounded-xl p-4 overflow-auto max-h-72">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function HealthCard({
  icon,
  label,
  value,
  loading,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  ok: boolean;
}) {
  return (
    <Card className="glass-panel border border-white/5 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            {icon}
          </div>
          <span className={`w-2.5 h-2.5 rounded-full ${loading ? "bg-zinc-600" : ok ? "bg-emerald-400" : "bg-amber-400"} ${loading ? "animate-pulse" : ""}`} />
        </div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-semibold text-white mt-1 capitalize">{loading ? "—" : value}</p>
      </CardContent>
    </Card>
  );
}
