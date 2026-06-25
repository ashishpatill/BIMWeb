/**
 * Public REST API v1 — Projects endpoint.
 * ⚠️ Requires Pro verification for auth and rate limiting.
 */

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { projects } from "@/db/schema"
import { eq } from "drizzle-orm"

const MAX_LIMIT = 100
const MAX_NAME_LENGTH = 256
const MAX_DESC_LENGTH = 2048

// In-memory rate limiter: map<key, { count, resetAt }>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

async function validateApiKey(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const apiKey = authHeader.slice(7)
  // TODO: Validate against stored API keys table for per-user identity
  if (apiKey !== process.env.API_SECRET_KEY) return null

  if (!checkRateLimit(apiKey)) {
    return null
  }

  return "api-user"
}

function sanitize(str: string, maxLen: number): string {
  return str.replace(/[<>&'"]/g, "").slice(0, maxLen)
}

export async function GET(request: NextRequest) {
  const userId = await validateApiKey(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawLimit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 20, MAX_LIMIT))
  const rawOffset = Math.max(0, Number(searchParams.get("offset")) || 0)

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .limit(rawLimit)
    .offset(rawOffset)

  return NextResponse.json({
    data: userProjects,
    pagination: { limit: rawLimit, offset: rawOffset, total: userProjects.length },
  })
}

export async function POST(request: NextRequest) {
  const userId = await validateApiKey(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit exceeded
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ") && !checkRateLimit(authHeader.slice(7))) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required (string)" }, { status: 400 })
  }

  const [project] = await db
    .insert(projects)
    .values({
      name: sanitize(body.name, MAX_NAME_LENGTH),
      description: body.description && typeof body.description === "string"
        ? sanitize(body.description, MAX_DESC_LENGTH)
        : null,
      ownerId: userId,
    })
    .returning()

  return NextResponse.json({ data: project }, { status: 201 })
}
