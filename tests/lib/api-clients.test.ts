import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  BIMAgentClient,
  BIMCloudClient,
  BIMIndexClient,
  BIMExtractClient,
  EcosystemError,
  checkHealth,
  getEcosystemHealth,
} from "../../src/lib/api-clients";

const ok = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("api-clients", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("BIMAgentClient", () => {
    it("query posts to /query and returns parsed response", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        ok({ query: "hi", response: "answer", trace: { steps: 2 } }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new BIMAgentClient("http://agent");
      const res = await client.query("hi", "u1");
      expect(res.response).toBe("answer");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("http://agent/query");
      expect(init?.method).toBe("POST");
      expect(JSON.parse((init?.body as string) || "{}")).toEqual({ query: "hi", user_id: "u1" });
    });

    it("query raises EcosystemError on non-2xx", async () => {
      global.fetch = vi.fn().mockResolvedValue(ok({ detail: "boom" }, 500)) as unknown as typeof fetch;
      const client = new BIMAgentClient("http://agent");
      await expect(client.query("hi")).rejects.toMatchObject({
        name: "EcosystemError",
        service: "BIMAgent",
        status: 500,
      });
    });

    it("query raises EcosystemError on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
      const client = new BIMAgentClient("http://agent");
      await expect(client.query("hi")).rejects.toMatchObject({
        name: "EcosystemError",
        service: "BIMAgent",
        status: 0,
      });
    });

    it("health calls /health", async () => {
      global.fetch = vi.fn().mockResolvedValue(ok({ status: "healthy" })) as unknown as typeof fetch;
      const res = await new BIMAgentClient("http://agent").health();
      expect(res.status).toBe("healthy");
    });
  });

  describe("BIMCloudClient", () => {
    it("routeQuery posts to /query (aligned with the real gateway)", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        ok({ result: { answer: "x" }, trace_id: "t1", latency_ms: 12.5, status: "ok" }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const res = await new BIMCloudClient("http://cloud").routeQuery("q", "u1");
      expect(res.trace_id).toBe("t1");
      expect(res.status).toBe("ok");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("http://cloud/query");
      expect(JSON.parse((init?.body as string) || "{}")).toEqual({ query: "q", user_id: "u1" });
    });

    it("health returns gateway/agent/circuit_breaker", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(ok({ gateway: "healthy", agent: "healthy", circuit_breaker: "closed" })) as unknown as typeof fetch;
      const res = await new BIMCloudClient("http://cloud").health();
      expect(res.gateway).toBe("healthy");
      expect(res.circuit_breaker).toBe("closed");
    });
  });

  describe("BIMIndexClient", () => {
    it("search GETs /search/<mode>?q=", async () => {
      const fetchMock = vi.fn().mockResolvedValue(ok([{ id: "1", content: "hello" }]));
      global.fetch = fetchMock as unknown as typeof fetch;

      const hits = await new BIMIndexClient("http://index").search("hello", "dense");
      expect(hits).toHaveLength(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("http://index/search/dense?q=hello");
      expect(init?.method).toBe("GET");
    });

    it("search accepts vectorless/dense/graph modes", async () => {
      global.fetch = vi.fn().mockImplementation(() => Promise.resolve(ok([]))) as unknown as typeof fetch;
      const client = new BIMIndexClient("http://index");
      for (const m of ["vectorless", "dense", "graph"] as const) {
        await client.search("q", m);
      }
      expect((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3);
    });

    it("search unwraps a { hits: [...] } payload", async () => {
      global.fetch = vi.fn().mockResolvedValue(ok({ hits: [{ id: "a" }] })) as unknown as typeof fetch;
      const hits = await new BIMIndexClient("http://index").search("q");
      expect(hits).toHaveLength(1);
    });

    it("search raises EcosystemError on non-2xx", async () => {
      global.fetch = vi.fn().mockResolvedValue(ok("err", 503)) as unknown as typeof fetch;
      await expect(new BIMIndexClient("http://index").search("q")).rejects.toBeInstanceOf(EcosystemError);
    });
  });

  describe("checkHealth", () => {
    it("returns ok=true on 200", async () => {
      global.fetch = vi.fn().mockResolvedValue(ok({ status: "healthy" })) as unknown as typeof fetch;
      const res = await checkHealth("svc", "http://svc");
      expect(res.ok).toBe(true);
      expect(res.status).toBe("healthy");
    });

    it("returns ok=false on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("down")) as unknown as typeof fetch;
      const res = await checkHealth("svc", "http://svc");
      expect(res.ok).toBe(false);
      expect(res.status).toBe("unreachable");
    });
  });

  describe("getEcosystemHealth", () => {
    it("aggregates all four services", async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(() => Promise.resolve(ok({ status: "healthy" }))) as unknown as typeof fetch;
      const res = await getEcosystemHealth();
      expect(Object.keys(res).sort()).toEqual(["BIMAgent", "BIMCloud", "BIMExtract", "BIMIndex"]);
      expect(res.BIMAgent.ok).toBe(true);
      expect(res.BIMCloud.ok).toBe(true);
      expect(res.BIMIndex.ok).toBe(true);
      expect(res.BIMExtract.ok).toBe(true);
    });
  });
});

describe("BIMExtractClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("health calls /health and returns status", async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ status: "healthy" })) as unknown as typeof fetch;
    const res = await new BIMExtractClient("http://extract").health();
    expect(res.status).toBe("healthy");
  });

  it("startPipeline posts to /pipeline/{name} and returns job info", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({ job_id: "j1", status_url: "/pipeline/ingest/j1/status", status: "running" }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await new BIMExtractClient("http://extract").startPipeline("ingest", {
      source: "doc.pdf",
    });
    expect(res.job_id).toBe("j1");
    expect(res.status).toBe("running");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://extract/pipeline/ingest");
    expect(init?.method).toBe("POST");
    expect(JSON.parse((init?.body as string) || "{}")).toEqual({ source: "doc.pdf" });
  });

  it("startPipeline raises EcosystemError on non-2xx", async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ detail: "validation error" }, 422)) as unknown as typeof fetch;
    await expect(
      new BIMExtractClient("http://extract").startPipeline("enrich", {}),
    ).rejects.toMatchObject({
      name: "EcosystemError",
      service: "BIMExtract",
      status: 422,
    });
  });

  it("pollPipeline returns immediately when status is terminal", async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ status: "completed", result: "ok" })) as unknown as typeof fetch;
    const res = await new BIMExtractClient("http://extract").pollPipeline("ingest", "j1", {
      interval: 100,
      timeout: 5000,
    });
    expect(res.status).toBe("completed");
  });

  it("pollPipeline throws EcosystemError on timeout", async () => {
    vi.useFakeTimers();
    // Use mockImplementation so each fetch call gets a fresh Response body
    global.fetch = vi.fn().mockImplementation(
      () => Promise.resolve(ok({ status: "running" })),
    ) as unknown as typeof fetch;
    const client = new BIMExtractClient("http://extract");
    const pollPromise = client.pollPipeline("ingest", "j1", {
      interval: 100,
      timeout: 500,
    });

    // Pre-attach catch handler to prevent unhandled rejection race
    const caught = pollPromise.catch((e: unknown) => e);

    // Advance timers past the timeout
    await vi.advanceTimersByTimeAsync(600);

    const error = await caught;
    expect(error).toBeInstanceOf(EcosystemError);
  });
});

