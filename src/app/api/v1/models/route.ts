import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { models } from "@/db/schema"
import { eq } from "drizzle-orm"

const MAX_LIMIT = 100

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
  if (apiKey !== process.env.API_SECRET_KEY) return null
  if (!checkRateLimit(apiKey)) return null
  return "api-user"
}

export async function GET(request: NextRequest) {
  const userId = await validateApiKey(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ") && !checkRateLimit(authHeader.slice(7))) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 20, MAX_LIMIT))
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0)

  const query = db.select().from(models)
  if (projectId) query.where(eq(models.projectId, Number(projectId)))

  const result = await query.limit(limit).offset(offset)
  return NextResponse.json({ data: result, pagination: { limit, offset } })
}
