import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks for external dependencies ────────────────────────────────────────────

vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@aws-sdk/client-s3", () => {
  // S3Client must be constructable with `new`
  class MockS3Client {
    send = vi.fn().mockResolvedValue({});
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
  };
});

// ── Helper: File compatible with jsdom (adds arrayBuffer if missing) ───────────

function createFile(name: string, content: string, type: string): File {
  const buf = Buffer.from(content);
  const file = new File([buf], name, { type });
  // jsdom may not implement File.prototype.arrayBuffer — provide it
  if (typeof file.arrayBuffer !== "function") {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => buf.buffer.slice(0) as ArrayBuffer,
      configurable: true,
    });
  }
  return file;
}

function createLargeFile(sizeBytes: number, type: string): File {
  const buf = Buffer.alloc(sizeBytes, 0x41);
  const file = new File([buf], "large.bin", { type });
  if (typeof file.arrayBuffer !== "function") {
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => buf.buffer.slice(0) as ArrayBuffer,
      configurable: true,
    });
  }
  return file;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("storage - size validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.STORAGE_BACKEND = "local";
    process.env.MAX_FILE_SIZE = "104857600"; // 100 MB
    process.env.UPLOAD_DIR = "public/uploads";
  });

  it("rejects files exceeding MAX_FILE_SIZE", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createLargeFile(104857601, "model/gltf-binary");

    await expect(uploadFile(file)).rejects.toThrow(/File too large/i);
  });

  it("allows files at exactly MAX_FILE_SIZE", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createLargeFile(104857600, "application/octet-stream");

    const result = await uploadFile(file, "models");
    expect(result.size).toBe(104857600);
  });

  it("allows small valid files", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createFile("tiny.glb", "data", "model/gltf-binary");

    const result = await uploadFile(file);
    expect(result.url).toMatch(/^\/uploads\/models\//);
    expect(result.key).toMatch(/^models\//);
  });
});

describe("storage - local backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.STORAGE_BACKEND = "local";
    process.env.MAX_FILE_SIZE = "104857600";
    process.env.UPLOAD_DIR = "public/uploads";
  });

  it("uploads file and calls fs.mkdir + fs.writeFile", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createFile("model.glb", "binary-data", "model/gltf-binary");

    await uploadFile(file, "models");

    const fsMod = await import("fs/promises");
    expect(fsMod.mkdir).toHaveBeenCalled();
    expect(fsMod.writeFile).toHaveBeenCalled();
  });

  it("sanitizes filenames with path separators", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createFile("../../etc/passwd", "content", "application/octet-stream");

    const result = await uploadFile(file, "models");
    // After sanitizeFilename, path separators and parent refs are stripped
    expect(result.key).not.toContain("..");
    expect(result.key).not.toContain("/etc");
    // The basename "passwd" is a valid filename after sanitization
    expect(result.key).toMatch(/^models\/\d+-.+$/);
  });

  it("allows all MIME types in local mode", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createFile("test.exe", "content", "application/x-msdownload");

    const result = await uploadFile(file, "models");
    expect(result.size).toBe(7);
  });
});

describe("storage - S3 backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.STORAGE_BACKEND = "s3";
    process.env.MAX_FILE_SIZE = "104857600";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "us-east-1";
  });

  it("rejects disallowed MIME types", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createFile("malicious.html", "<html>", "text/html");

    await expect(uploadFile(file)).rejects.toThrow(/Unsupported file type/i);
  });

  it("allows allowed MIME types (application/pdf)", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createFile("doc.pdf", "PDF content", "application/pdf");

    const result = await uploadFile(file, "documents");
    expect(result.key).toMatch(/^documents\//);
    expect(result.url).toContain("amazonaws.com");
  });

  it("allows model/gltf-binary files", async () => {
    const { uploadFile } = await import("../../src/lib/storage");
    const file = createFile("model.glb", "binary", "model/gltf-binary");

    const result = await uploadFile(file, "models");
    expect(result.key).toMatch(/^models\//);
    expect(result.url).toContain("amazonaws.com");
  });
});

describe("storage - deleteFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.STORAGE_BACKEND = "local";
  });

  it("rejects path traversal in key", async () => {
    const { deleteFile } = await import("../../src/lib/storage");

    await expect(deleteFile("../secret.txt")).rejects.toThrow(/path traversal/i);
  });

  it("rejects nested path traversal", async () => {
    const { deleteFile } = await import("../../src/lib/storage");

    await expect(deleteFile("models/../../../etc/passwd")).rejects.toThrow(
      /path traversal/i,
    );
  });

  it("allows safe keys", async () => {
    const { deleteFile } = await import("../../src/lib/storage");

    await expect(deleteFile("models/2026-01-01-model.glb")).resolves.toBeUndefined();
  });

  it("handles ENOENT gracefully in local mode", async () => {
    const fsMod = await import("fs/promises");
    const enoent = new Error("ENOENT");
    (enoent as NodeJS.ErrnoException).code = "ENOENT";
    (fsMod.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(enoent);

    const { deleteFile } = await import("../../src/lib/storage");

    await expect(deleteFile("models/ghost.glb")).resolves.toBeUndefined();
  });

  it("propagates non-ENOENT errors in local mode", async () => {
    const fsMod = await import("fs/promises");
    (fsMod.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("permission denied"),
    );

    const { deleteFile } = await import("../../src/lib/storage");

    await expect(deleteFile("models/protected.glb")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("supports S3 delete flow", async () => {
    vi.resetModules();
    process.env.STORAGE_BACKEND = "s3";
    const { deleteFile } = await import("../../src/lib/storage");

    await expect(deleteFile("models/old.glb")).resolves.toBeUndefined();
  });
});
