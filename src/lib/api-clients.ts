/**
 * API clients for BIMAgent, BIMCloud, BIMIndex.
 * Cross-repo ecosystem integration (T-WEB-14).
 *
 * Unified error handling: every call raises {@link EcosystemError} on failure
 * (non-2xx, network error, or timeout) so callers can treat all three services
 * uniformly. All endpoints are aligned with the live FastAPI servers in each
 * repo (BIMAgent /query, BIMCloud /query edge gateway, BIMIndex /search/<mode>).
 */

const BIMAGENT_URL = process.env.NEXT_PUBLIC_BIMAGENT_URL || "http://localhost:8000";
const BIMCLOUD_URL = process.env.NEXT_PUBLIC_BIMCLOUD_URL || "http://localhost:8080";
const BIMINDEX_URL = process.env.NEXT_PUBLIC_BIMINDEX_URL || "http://localhost:8001";
const BIMEXTRACT_URL = process.env.NEXT_PUBLIC_BIMEXTRACT_URL || "http://localhost:8200";

export type RetrievalMode = "vectorless" | "dense" | "graph";

/** Unified error raised by every ecosystem client. */
export class EcosystemError extends Error {
  readonly service: string;
  readonly status: number;
  readonly endpoint: string;

  constructor(service: string, endpoint: string, status: number, message: string) {
    super(`[${service}] ${endpoint} -> ${status}: ${message}`);
    this.name = "EcosystemError";
    this.service = service;
    this.endpoint = endpoint;
    this.status = status;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Check a health endpoint and normalise the response to a status string. */
export async function checkHealth(
  service: string,
  url: string,
): Promise<{ service: string; status: string; ok: boolean }> {
  try {
    const res = await fetchWithTimeout(`${url}/health`, {}, 5000);
    const ok = res.ok;
    const body = (await parseJson(res)) as Record<string, unknown> | null;
    const status =
      (body && (typeof body.status === "string" ? body.status : (body as Record<string, unknown>).gateway)) ||
      (ok ? "healthy" : "unhealthy");
    return { service, status: String(status), ok };
  } catch {
    return { service, status: "unreachable", ok: false };
  }
}

export interface AgentQueryResponse {
  query: string;
  response: string;
  trace: Record<string, unknown>;
}

export class BIMAgentClient {
  constructor(private baseUrl: string = BIMAGENT_URL) {}

  async query(text: string, userId?: string): Promise<AgentQueryResponse> {
    const endpoint = "/query";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, user_id: userId }),
      });
    } catch (e) {
      throw new EcosystemError("BIMAgent", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) {
      throw new EcosystemError("BIMAgent", endpoint, res.status, await res.text());
    }
    return (await parseJson(res)) as AgentQueryResponse;
  }

  async health(): Promise<{ status: string }> {
    const res = await fetchWithTimeout(`${this.baseUrl}/health`, {}, 5000);
    if (!res.ok) throw new EcosystemError("BIMAgent", "/health", res.status, await res.text());
    return (await parseJson(res)) as { status: string };
  }
}

export interface CloudQueryResponse {
  result: Record<string, unknown> | null;
  trace_id: string;
  latency_ms: number | null;
  status: string;
  error?: string | null;
}

export class BIMCloudClient {
  constructor(private baseUrl: string = BIMCLOUD_URL) {}

  /** Route a query through the BIMCloud edge gateway to BIMAgent. */
  async routeQuery(query: string, userId?: string): Promise<CloudQueryResponse> {
    const endpoint = "/query";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, user_id: userId }),
      });
    } catch (e) {
      throw new EcosystemError("BIMCloud", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) {
      throw new EcosystemError("BIMCloud", endpoint, res.status, await res.text());
    }
    return (await parseJson(res)) as CloudQueryResponse;
  }

  async health(): Promise<{ gateway: string; agent: string; circuit_breaker: string }> {
    const res = await fetchWithTimeout(`${this.baseUrl}/health`, {}, 5000);
    if (!res.ok) throw new EcosystemError("BIMCloud", "/health", res.status, await res.text());
    return (await parseJson(res)) as { gateway: string; agent: string; circuit_breaker: string };
  }
}

export interface IndexSearchHit {
  [key: string]: unknown;
}

export interface IndexIngestDocument {
  title: string;
  text?: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

export interface IndexIngestResponse {
  status: string;
  indexed: number;
  backend?: string;
  error?: string;
}

export class BIMIndexClient {
  constructor(private baseUrl: string = BIMINDEX_URL) {}

  async search(query: string, mode: RetrievalMode = "vectorless"): Promise<IndexSearchHit[]> {
    const endpoint = `/search/${mode}`;
    let res: Response;
    try {
      res = await fetchWithTimeout(
        `${this.baseUrl}${endpoint}?q=${encodeURIComponent(query)}`,
        { method: "GET" },
      );
    } catch (e) {
      throw new EcosystemError("BIMIndex", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) {
      throw new EcosystemError("BIMIndex", endpoint, res.status, await res.text());
    }
    const data = await parseJson(res);
    if (Array.isArray(data)) return data as IndexSearchHit[];
    const record = data as Record<string, unknown>;
    const hits = record.results ?? record.hits ?? [];
    return (Array.isArray(hits) ? hits : []) as IndexSearchHit[];
  }

  /** POST /ingest — index parsed document chunks into the live retrieval backends. */
  async ingest(documents: IndexIngestDocument[]): Promise<IndexIngestResponse> {
    const endpoint = "/ingest";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      });
    } catch (e) {
      throw new EcosystemError("BIMIndex", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) {
      throw new EcosystemError("BIMIndex", endpoint, res.status, await res.text());
    }
    return (await parseJson(res)) as IndexIngestResponse;
  }

  async health(): Promise<{ status: string }> {
    const res = await fetchWithTimeout(`${this.baseUrl}/health`, {}, 5000);
    if (!res.ok) throw new EcosystemError("BIMIndex", "/health", res.status, await res.text());
    return (await parseJson(res)) as { status: string };
  }
}

export class BIMExtractClient {
  constructor(private baseUrl: string = BIMEXTRACT_URL) {}

  /** GET /health */
  async health(): Promise<{ status: string }> {
    const endpoint = "/health";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {}, 5000);
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return (await parseJson(res)) as { status: string };
  }

  /** GET /skills — list available parsing/graph skills */
  async getSkills(): Promise<unknown> {
    const endpoint = "/skills";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`);
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return parseJson(res);
  }

  /**
   * POST /pipeline/{name} — start a pipeline job.
   * @param name - Pipeline type: "ingest", "page-index", or "enrich"
   * @param body - Arbitrary pipeline configuration payload
   */
  async startPipeline(
    name: "ingest" | "page-index" | "enrich",
    body: unknown,
  ): Promise<{ job_id: string; status_url: string; status: string }> {
    const endpoint = `/pipeline/${name}`;
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return (await parseJson(res)) as { job_id: string; status_url: string; status: string };
  }

  /** GET /pipeline/{name}/{jobId}/status */
  async getPipelineStatus(name: string, jobId: string): Promise<Record<string, unknown>> {
    const endpoint = `/pipeline/${name}/${jobId}/status`;
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`);
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return (await parseJson(res)) as Record<string, unknown>;
  }

  /**
   * Poll a pipeline until it reaches a terminal status or the timeout expires.
   * Terminal statuses: "completed", "failed", "error", "cancelled".
   */
  async pollPipeline(
    name: string,
    jobId: string,
    opts: { interval?: number; timeout?: number } = {},
  ): Promise<Record<string, unknown>> {
    const interval = opts.interval ?? 2000;
    const maxTimeout = opts.timeout ?? 120000;
    const startTime = Date.now();
    const terminalStatuses = new Set(["completed", "failed", "error", "cancelled"]);

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxTimeout) {
        throw new EcosystemError(
          "BIMExtract",
          `/pipeline/${name}/${jobId}/status`,
          0,
          `Poll timeout after ${maxTimeout}ms`,
        );
      }

      const status = await this.getPipelineStatus(name, jobId);
      const currentStatus = status?.status;

      if (typeof currentStatus === "string" && terminalStatuses.has(currentStatus)) {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  /** POST /parsers/parse — parse text into structured data */
  async parse(text: string, format?: string): Promise<unknown> {
    const endpoint = "/parsers/parse";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, format }),
      });
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return parseJson(res);
  }

  /** POST /graph/build — build a knowledge graph from a source */
  async buildGraph(source: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    const endpoint = "/graph/build";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, ...payload }),
      });
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return parseJson(res);
  }

  /** POST /graph/search — search within a knowledge graph */
  async searchGraph(
    query: string,
    graph: unknown,
    opts: Record<string, unknown> = {},
  ): Promise<unknown> {
    const endpoint = "/graph/search";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, graph, ...opts }),
      });
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return parseJson(res);
  }

  /** POST /auto-rag/run — run an auto-RAG pipeline */
  async runAutoRag(query: string, context: unknown): Promise<unknown> {
    const endpoint = "/auto-rag/run";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, context }),
      });
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return parseJson(res);
  }

  /** POST /mdoc/run — run an mdoc pipeline */
  async runMdoc(query: string, context: unknown): Promise<unknown> {
    const endpoint = "/mdoc/run";
    let res: Response;
    try {
      res = await fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, context }),
      });
    } catch (e) {
      throw new EcosystemError("BIMExtract", endpoint, 0, (e as Error).message);
    }
    if (!res.ok) throw new EcosystemError("BIMExtract", endpoint, res.status, await res.text());
    return parseJson(res);
  }
}

export const bimAgent = new BIMAgentClient();
export const bimCloud = new BIMCloudClient();
export const bimIndex = new BIMIndexClient();
export const bimExtract = new BIMExtractClient();

/** Ping all four ecosystem services and return a unified health snapshot. */
export async function getEcosystemHealth(): Promise<Record<string, { status: string; ok: boolean }>> {
  const [agent, cloud, index, extract] = await Promise.all([
    checkHealth("BIMAgent", BIMAGENT_URL),
    checkHealth("BIMCloud", BIMCLOUD_URL),
    checkHealth("BIMIndex", BIMINDEX_URL),
    checkHealth("BIMExtract", BIMEXTRACT_URL),
  ]);
  return {
    BIMAgent: { status: agent.status, ok: agent.ok },
    BIMCloud: { status: cloud.status, ok: cloud.ok },
    BIMIndex: { status: index.status, ok: index.ok },
    BIMExtract: { status: extract.status, ok: extract.ok },
  };
}
