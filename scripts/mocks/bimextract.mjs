#!/usr/bin/env node
/**
 * BIMExtract preprocessing mock for local development.
 * Implements the ecosystem API contract expected by BIMWeb and BIMAgent.
 *
 * Usage: PORT=8200 node scripts/mocks/bimextract.mjs
 */

import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 8200);

/** @type {Map<string, { name: string; status: string; createdAt: number; payload: unknown; result?: unknown }>} */
const jobs = new Map();

const SKILLS = [
  { name: "vlm_ingestion", description: "Docling + PaddleOCR visual parsing" },
  { name: "contextual_enrichment", description: "Append document context to chunks" },
  { name: "inverse_hyde", description: "Pre-compute synthetic queries per block" },
  { name: "page_index_navigation", description: "Build hierarchical page tree" },
  { name: "kv_cache_materialization", description: "Pre-cache high-frequency nodes" },
];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function completeJob(jobId) {
  const job = jobs.get(jobId);
  if (!job || job.status !== "running") return;

  const docPath = job.payload?.doc_path || job.payload?.file_url || "document";
  const name = String(docPath).split("/").pop() || "document";

  job.status = "completed";
  job.result = {
    status: "completed",
    chunks: [
      {
        title: `${name} — Overview`,
        text: `Parsed overview section from ${name}. Fire rating and structural notes extracted.`,
      },
      {
        title: `${name} — Specifications`,
        text: `Technical specifications and material requirements from ${name}.`,
      },
    ],
    chunk_count: 2,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "bimextract-mock" }));
    return;
  }

  if (url.pathname === "/skills" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ skills: SKILLS }));
    return;
  }

  const pipelineMatch = url.pathname.match(/^\/pipeline\/([^/]+)$/);
  if (pipelineMatch && req.method === "POST") {
    const pipelineName = pipelineMatch[1];
    const body = await readBody(req);
    const jobId = randomUUID();
    const statusUrl = `/pipeline/${pipelineName}/${jobId}/status`;

    jobs.set(jobId, {
      name: pipelineName,
      status: "running",
      createdAt: Date.now(),
      payload: body,
    });

    setTimeout(() => completeJob(jobId), 800);

    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        job_id: jobId,
        status_url: statusUrl,
        status: "running",
      }),
    );
    return;
  }

  const statusMatch = url.pathname.match(/^\/pipeline\/([^/]+)\/([^/]+)\/status$/);
  if (statusMatch && req.method === "GET") {
    const jobId = statusMatch[2];
    const job = jobs.get(jobId);
    if (!job) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Job not found" }));
      return;
    }

    if (job.status === "running" && Date.now() - job.createdAt > 1500) {
      completeJob(jobId);
    }

    const payload = job.status === "completed" ? job.result : { status: job.status };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[bimextract-mock] listening on http://127.0.0.1:${PORT}`);
});
