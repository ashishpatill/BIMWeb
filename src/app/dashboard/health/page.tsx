/**
 * T-PAGE-HEALTH — Platform Health page (/dashboard/health)
 *
 * Server component: fetches initial health data for all four ecosystem services
 * (BIMAgent, BIMIndex, BIMExtract, BIMCloud) plus /metrics from BIMCloud.
 * Passes everything to <HealthClient /> for interactivity.
 */
import { getEcosystemHealth, bimCloud, bimIndex, bimExtract } from "@/lib/api-clients";
import { HealthClient } from "./health-client";

export const dynamic = "force-dynamic";

// ── Types (reused by client) ──────────────────────────────────────

export interface CloudHealthDetail {
  gateway: string;
  agent: string;
  circuit_breaker: string;
  region?: string | string[];
}

export interface IndexHealthDetail {
  status: string;
  modes?: string[];
}

export interface ExtractHealthDetail {
  status: string;
}

export interface MetricsData {
  totalRequests: number;
  errorRate: number | null;
  p95LatencyMs: number | null;
}

export interface HealthPageData {
  ecosystem: Record<string, { status: string; ok: boolean }>;
  cloud: CloudHealthDetail | null;
  cloudError: string | null;
  index: IndexHealthDetail | null;
  indexError: string | null;
  extract: ExtractHealthDetail | null;
  extractError: string | null;
  skillsCount: number | null;
  metrics: MetricsData | null;
  metricsError: string | null;
}

// ── Constants ─────────────────────────────────────────────────────

const BIMCLOUD_URL = process.env.NEXT_PUBLIC_BIMCLOUD_URL || "http://localhost:8080";
const BIMINDEX_URL = process.env.NEXT_PUBLIC_BIMINDEX_URL || "http://localhost:8001";

// ── Helpers ───────────────────────────────────────────────────────

/** Parse Prometheus text-format metrics into structured stats. */
function parsePrometheusMetrics(text: string): MetricsData {
  const lines = text.split("\n");
  let totalRequests = 0;
  let errorCount = 0;
  const buckets: { le: number; count: number }[] = [];
  let histogramTotal = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // http_requests_total{...} value
    if (trimmed.startsWith("http_requests_total")) {
      const match = trimmed.match(/http_requests_total\{.*\}\s+(\d+(?:\.\d+)?)/);
      if (match) {
        const value = Math.round(parseFloat(match[1]));
        totalRequests += value;
        // Count errors (5xx status codes)
        if (/status="5\d{2}"/.test(trimmed)) {
          errorCount += value;
        }
      }
    }

    // http_request_duration_seconds_bucket{le="..."} count
    if (trimmed.startsWith("http_request_duration_seconds_bucket")) {
      const match = trimmed.match(/le="([^"]+)"\}\s+(\d+(?:\.\d+)?)/);
      if (match) {
        buckets.push({ le: parseFloat(match[1]), count: Math.round(parseFloat(match[2])) });
      }
    }

    // http_request_duration_seconds_count (total observations)
    if (trimmed.startsWith("http_request_duration_seconds_count")) {
      const match = trimmed.match(/\}\s+(\d+(?:\.\d+)?)$/);
      if (match) {
        histogramTotal = Math.round(parseFloat(match[1]));
      }
    }
  }

  // Use the last bucket's count if _count line wasn't found
  if (histogramTotal === 0 && buckets.length > 0) {
    histogramTotal = buckets[buckets.length - 1].count;
  }

  // Find p95 from histogram buckets
  let p95LatencyMs: number | null = null;
  if (histogramTotal > 0 && buckets.length > 0) {
    const threshold = histogramTotal * 0.95;
    for (const b of buckets) {
      if (b.count >= threshold) {
        p95LatencyMs = b.le * 1000; // Convert seconds to ms
        break;
      }
    }
  }

  const errorRate = totalRequests > 0 ? errorCount / totalRequests : null;

  return { totalRequests, errorRate, p95LatencyMs };
}

// ── Page component ────────────────────────────────────────────────

export default async function HealthPage() {
  const [ecosystem, cloudResult, indexResult, extractResult, skillsResult, metricsResult] =
    await Promise.all([
      getEcosystemHealth(),
      bimCloud
        .health()
        .then(async (h) => {
          // Try to capture extra fields (region) via raw fetch
          let cloudRaw: Record<string, unknown> = {};
          try {
            const rawRes = await fetch(`${BIMCLOUD_URL}/health`, { signal: AbortSignal.timeout(3000) });
            if (rawRes.ok) {
              cloudRaw = (await rawRes.json()) as Record<string, unknown>;
            }
          } catch {
            // Use what we have from the typed client
          }
          return {
            ...h,
            region: (cloudRaw.region as string | string[] | undefined) ?? undefined,
          } as CloudHealthDetail;
        })
        .catch((e: unknown) => {
          const error = e instanceof Error ? e.message : "Unknown error";
          return { error } as { error: string };
        }),
      bimIndex
        .health()
        .then(async (h) => {
          // Try to capture extra fields (modes) via raw fetch
          let indexRaw: Record<string, unknown> = {};
          try {
            const rawRes = await fetch(`${BIMINDEX_URL}/health`, { signal: AbortSignal.timeout(3000) });
            if (rawRes.ok) {
              indexRaw = (await rawRes.json()) as Record<string, unknown>;
            }
          } catch {
            // Use what we have
          }
          let modes: string[] | undefined;
          if (Array.isArray(indexRaw.modes)) {
            modes = indexRaw.modes as string[];
          } else if (Array.isArray(indexRaw.mode)) {
            modes = indexRaw.mode as string[];
          }
          return { ...h, modes } as IndexHealthDetail;
        })
        .catch((e: unknown) => {
          const error = e instanceof Error ? e.message : "Unknown error";
          return { error: error as string };
        }),
      bimExtract
        .health()
        .then((h) => h as ExtractHealthDetail)
        .catch((e: unknown) => {
          const error = e instanceof Error ? e.message : "Unknown error";
          return { error: error as string };
        }),
      bimExtract
        .getSkills()
        .then((skills) => {
          if (Array.isArray(skills)) return skills.length;
          if (skills && typeof skills === "object") {
            const obj = skills as Record<string, unknown>;
            if (Array.isArray(obj.skills)) return obj.skills.length;
            if (Array.isArray(obj.data)) return obj.data.length;
            return Object.keys(obj).length;
          }
          return null;
        })
        .catch(() => null as number | null),
      fetch(`${BIMCLOUD_URL}/metrics`, { signal: AbortSignal.timeout(5000) })
        .then(async (res) => {
          if (!res.ok) return null;
          const text = await res.text();
          return parsePrometheusMetrics(text);
        })
        .catch(() => null as MetricsData | null),
    ]);

  // Unwrap results
  const cloud =
    "error" in cloudResult
      ? ({ detail: null, error: cloudResult.error } as { detail: null; error: string })
      : ({ detail: cloudResult as CloudHealthDetail, error: null } as {
          detail: CloudHealthDetail;
          error: null;
        });

  const index =
    "error" in indexResult
      ? ({ detail: null, error: indexResult.error } as { detail: null; error: string })
      : ({ detail: indexResult as IndexHealthDetail, error: null } as {
          detail: IndexHealthDetail;
          error: null;
        });

  const extract =
    "error" in extractResult
      ? ({ detail: null, error: extractResult.error } as { detail: null; error: string })
      : ({ detail: extractResult as ExtractHealthDetail, error: null } as {
          detail: ExtractHealthDetail;
          error: null;
        });

  const data: HealthPageData = {
    ecosystem,
    cloud: cloud.detail,
    cloudError: cloud.error,
    index: index.detail,
    indexError: index.error,
    extract: extract.detail,
    extractError: extract.error,
    skillsCount: skillsResult,
    metrics: metricsResult,
    metricsError: metricsResult === null ? "Metrics endpoint did not respond" : null,
  };

  return <HealthClient data={data} />;
}
