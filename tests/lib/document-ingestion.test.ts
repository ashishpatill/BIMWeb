import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractIngestDocuments,
  ingestDocumentViaEcosystem,
} from "@/lib/document-ingestion";

vi.mock("@/lib/api-clients", () => ({
  bimExtract: {
    startPipeline: vi.fn(),
    pollPipeline: vi.fn(),
  },
  bimIndex: {
    ingest: vi.fn(),
  },
  EcosystemError: class EcosystemError extends Error {
    service: string;
    status: number;
    endpoint: string;
    constructor(service: string, endpoint: string, status: number, message: string) {
      super(message);
      this.name = "EcosystemError";
      this.service = service;
      this.endpoint = endpoint;
      this.status = status;
    }
  },
}));

import { bimExtract, bimIndex } from "@/lib/api-clients";

describe("document-ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractIngestDocuments", () => {
    it("maps chunk array to ingest documents", () => {
      const docs = extractIngestDocuments("spec.pdf", "/uploads/spec.pdf", {
        chunks: [
          { title: "Section 1", text: "Fire rating 60 min" },
          { title: "Section 2", body: "Curtain wall glazing" },
        ],
      });
      expect(docs).toHaveLength(2);
      expect(docs[0].text).toBe("Fire rating 60 min");
      expect(docs[1].text).toBe("Curtain wall glazing");
    });

    it("falls back to markdown text field", () => {
      const docs = extractIngestDocuments("report.pdf", "/uploads/report.pdf", {
        markdown: "# Summary\nFull structural analysis.",
      });
      expect(docs).toHaveLength(1);
      expect(docs[0].text).toContain("structural analysis");
    });
  });

  describe("ingestDocumentViaEcosystem", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("runs extract then indexes into BIMIndex", async () => {
      vi.mocked(bimExtract.startPipeline).mockResolvedValue({
        job_id: "j1",
        status_url: "/pipeline/ingest/j1/status",
        status: "running",
      });
      vi.mocked(bimExtract.pollPipeline).mockResolvedValue({
        status: "completed",
        chunks: [
          { title: "A", text: "chunk one" },
          { title: "B", text: "chunk two" },
        ],
      });
      vi.mocked(bimIndex.ingest).mockResolvedValue({
        status: "ok",
        indexed: 2,
        backend: "tantivy",
      });

      const result = await ingestDocumentViaEcosystem({
        docName: "spec.pdf",
        fileUrl: "/uploads/spec.pdf",
      });

      expect(result.success).toBe(true);
      expect(result.chunks).toBe(2);
      expect(bimIndex.ingest).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: "chunk one" }),
          expect.objectContaining({ text: "chunk two" }),
        ]),
      );
    });

    it("skips BIMIndex when unhealthy", async () => {
      vi.mocked(bimExtract.startPipeline).mockResolvedValue({
        job_id: "j2",
        status_url: "/pipeline/ingest/j2/status",
        status: "running",
      });
      vi.mocked(bimExtract.pollPipeline).mockResolvedValue({
        status: "completed",
        chunk_count: 5,
      });

      const result = await ingestDocumentViaEcosystem(
        { docName: "a.pdf", fileUrl: "/a.pdf" },
        { bimIndexHealthy: false },
      );

      expect(result.success).toBe(true);
      expect(result.indexSkipped).toBe(true);
      expect(bimIndex.ingest).not.toHaveBeenCalled();
    });

    it("returns error on pipeline failure", async () => {
      vi.mocked(bimExtract.startPipeline).mockResolvedValue({
        job_id: "j3",
        status_url: "/pipeline/ingest/j3/status",
        status: "running",
      });
      vi.mocked(bimExtract.pollPipeline).mockResolvedValue({
        status: "failed",
        error: "OCR timeout",
      });

      const result = await ingestDocumentViaEcosystem({
        docName: "bad.pdf",
        fileUrl: "/bad.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("OCR timeout");
    });
  });
});
