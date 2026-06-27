/**
 * File upload endpoint.
 *
 * POST /api/upload  → upload a file with Kinde auth + size/MIME validation.
 *
 * @security Requires valid Kinde session. No anonymous uploads.
 *           Size limit (100MB) and MIME allowlist enforced server-side.
 */

import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Reuse storage.ts validation constants (must match)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "104857600", 10); // 100MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "model/gltf+json",
  "model/gltf-binary",
  "application/octet-stream",
];

export async function POST(request: NextRequest) {
  // ── Kinde auth check ──────────────────────────────────────────────────────
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── Size validation ─────────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB (max ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB)`,
        },
        { status: 400 },
      );
    }

    // ── MIME type validation ────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Allowed: PDF, PNG, JPEG, WebP, glTF, IFC`,
        },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}-${safeName}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({
      url,
      fileSize: `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`,
      name: file.name,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
