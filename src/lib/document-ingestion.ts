/**
 * Client-side orchestration: BIMExtract pipeline → BIMIndex ingest.
 * Used by the Documents page after a file upload or re-index.
 */

import { bimExtract, bimIndex, EcosystemError } from "@/lib/api-clients";
import type { IndexIngestDocument } from "@/lib/api-clients";

export interface DocumentIngestionInput {
  docName: string;
  fileUrl: string;
}

export interface DocumentIngestionResult {
  success: boolean;
  chunks?: number;
  error?: string;
  /** True when BIMIndex ingest was skipped (offline or no chunks). */
  indexSkipped?: boolean;
}

const TERMINAL_SUCCESS = new Set(["completed", "ready", "success", "done"]);

/** Map BIMExtract pipeline output to BIMIndex ingest documents. */
export function extractIngestDocuments(
  docName: string,
  fileUrl: string,
  pipelineStatus: Record<string, unknown>,
): IndexIngestDocument[] {
  const rawChunks =
    pipelineStatus.chunks ??
    pipelineStatus.documents ??
    pipelineStatus.text_chunks;

  if (Array.isArray(rawChunks)) {
    const docs: IndexIngestDocument[] = [];
    for (const [index, chunk] of rawChunks.entries()) {
      if (typeof chunk === "string") {
        docs.push({ title: `${docName} (part ${index + 1})`, text: chunk });
        continue;
      }
      if (typeof chunk === "object" && chunk !== null) {
        const c = chunk as Record<string, unknown>;
        const text = String(c.text ?? c.body ?? c.content ?? c.snippet ?? "");
        if (!text) continue;
        docs.push({
          title: String(c.title ?? c.name ?? `${docName} (part ${index + 1})`),
          text,
          metadata: {
            source: docName,
            doc_path: fileUrl,
            ...(typeof c.metadata === "object" && c.metadata !== null
              ? (c.metadata as Record<string, unknown>)
              : {}),
          },
        });
      }
    }

    if (docs.length > 0) return docs;
  }

  const fallbackText = pipelineStatus.text ?? pipelineStatus.content ?? pipelineStatus.markdown;
  if (typeof fallbackText === "string" && fallbackText.trim()) {
    return [
      {
        title: docName,
        text: fallbackText,
        metadata: { source: docName, doc_path: fileUrl },
      },
    ];
  }

  return [
    {
      title: docName,
      text: docName,
      metadata: { source: docName, doc_path: fileUrl, placeholder: true },
    },
  ];
}

/**
 * Run the full extract → index pipeline for one document.
 * @param bimIndexHealthy - when false, extract still runs but index step is skipped
 */
export async function ingestDocumentViaEcosystem(
  input: DocumentIngestionInput,
  opts: { bimIndexHealthy?: boolean } = {},
): Promise<DocumentIngestionResult> {
  const { docName, fileUrl } = input;
  const bimIndexHealthy = opts.bimIndexHealthy ?? true;

  try {
    const pipeline = await bimExtract.startPipeline("ingest", {
      doc_path: fileUrl,
      text_content: null,
    });

    const finalStatus = await bimExtract.pollPipeline("ingest", pipeline.job_id, {
      interval: 2000,
      timeout: 120000,
    });

    const pipelineResultStatus = String(finalStatus?.status ?? "");
    const isSuccess = TERMINAL_SUCCESS.has(pipelineResultStatus);

    if (!isSuccess) {
      return {
        success: false,
        error:
          typeof finalStatus?.error === "string"
            ? finalStatus.error
            : `Pipeline ended with status: ${pipelineResultStatus || "unknown"}`,
      };
    }

    const chunkCount =
      typeof finalStatus.chunks === "number"
        ? finalStatus.chunks
        : typeof finalStatus.chunk_count === "number"
          ? finalStatus.chunk_count
          : undefined;

    if (!bimIndexHealthy) {
      return {
        success: true,
        chunks: chunkCount,
        indexSkipped: true,
      };
    }

    const ingestDocs = extractIngestDocuments(docName, fileUrl, finalStatus);
    const ingestResult = await bimIndex.ingest(ingestDocs);

    const indexed =
      typeof ingestResult.indexed === "number" ? ingestResult.indexed : ingestDocs.length;

    return {
      success: true,
      chunks: chunkCount ?? indexed,
    };
  } catch (err) {
    const message =
      err instanceof EcosystemError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Ingestion pipeline failed";
    return { success: false, error: message };
  }
}
