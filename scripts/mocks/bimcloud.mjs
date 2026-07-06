#!/usr/bin/env node
/**
 * BIMCloud edge-gateway mock for local development.
 * Implements /health, /query (proxies to BIMAgent), /metrics (Prometheus text).
 *
 * Usage: PORT=8080 BIMAGENT_URL=http://localhost:8000 node scripts/mocks/bimcloud.mjs
 */

import http from "node:http";

const PORT = Number(process.env.PORT || 8080);
const BIMAGENT_URL = process.env.BIMAGENT_URL || "http://localhost:8000";

let requestCount = 0;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function agentHealth() {
  try {
    const res = await fetch(`${BIMAGENT_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const body = await res.json();
      return body.status === "healthy" || body.status === "ok" ? "healthy" : "degraded";
    }
  } catch {
    /* agent offline */
  }
  return "unreachable";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  requestCount++;

  if (url.pathname === "/health" && req.method === "GET") {
    const agent = await agentHealth();
    const breaker = agent === "healthy" ? "closed" : agent === "degraded" ? "half-open" : "open";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        gateway: "healthy",
        agent,
        circuit_breaker: breaker,
        region: "local",
      }),
    );
    return;
  }

  if (url.pathname === "/metrics" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
    res.end(
      [
        `# HELP http_requests_total Total HTTP requests`,
        `# TYPE http_requests_total counter`,
        `http_requests_total{status="200"} ${requestCount}`,
        `http_requests_total{status="500"} 0`,
        `# HELP http_request_duration_seconds Request duration`,
        `# TYPE http_request_duration_seconds histogram`,
        `http_request_duration_seconds_bucket{le="0.1"} ${Math.floor(requestCount * 0.3)}`,
        `http_request_duration_seconds_bucket{le="0.5"} ${Math.floor(requestCount * 0.7)}`,
        `http_request_duration_seconds_bucket{le="1.0"} ${requestCount}`,
        `http_request_duration_seconds_count ${requestCount}`,
      ].join("\n") + "\n",
    );
    return;
  }

  if (url.pathname === "/query" && req.method === "POST") {
    const started = Date.now();
    const raw = await readBody(req);
    try {
      const agentRes = await fetch(`${BIMAGENT_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
        signal: AbortSignal.timeout(30_000),
      });
      const agentBody = await agentRes.json();
      res.writeHead(agentRes.ok ? 200 : agentRes.status, {
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          result: agentBody,
          trace_id: `mock-${Date.now().toString(36)}`,
          latency_ms: Date.now() - started,
          status: agentRes.ok ? "ok" : "error",
        }),
      );
    } catch (err) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          result: null,
          trace_id: `mock-${Date.now().toString(36)}`,
          latency_ms: Date.now() - started,
          status: "error",
          error: err instanceof Error ? err.message : "BIMAgent unreachable",
        }),
      );
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[bimcloud-mock] listening on http://127.0.0.1:${PORT} (agent: ${BIMAGENT_URL})`);
});
