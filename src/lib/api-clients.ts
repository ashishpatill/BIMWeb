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
    return (Array.isArray(data) ? data : (data as Record<string, unknown>)?.hits ?? []) as IndexSearchHit[];
  }

  async health(): Promise<{ status: string }> {
    const res = await fetchWithTimeout(`${this.baseUrl}/health`, {}, 5000);
    if (!res.ok) throw new EcosystemError("BIMIndex", "/health", res.status, await res.text());
    return (await parseJson(res)) as { status: string };
  }
}

export const bimAgent = new BIMAgentClient();
export const bimCloud = new BIMCloudClient();
export const bimIndex = new BIMIndexClient();

/** Ping all three ecosystem services and return a unified health snapshot. */
export async function getEcosystemHealth(): Promise<Record<string, { status: string; ok: boolean }>> {
  const [agent, cloud, index] = await Promise.all([
    checkHealth("BIMAgent", BIMAGENT_URL),
    checkHealth("BIMCloud", BIMCLOUD_URL),
    checkHealth("BIMIndex", BIMINDEX_URL),
  ]);
  return {
    BIMAgent: { status: agent.status, ok: agent.ok },
    BIMCloud: { status: cloud.status, ok: cloud.ok },
    BIMIndex: { status: index.status, ok: index.ok },
  };
}
