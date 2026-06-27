/**
 * OpenAPI 3.1 specification endpoint.
 *
 * GET /api/v1/openapi  → returns the hand-written OpenAPI spec as JSON.
 *
 * This is consumed by the Scalar API Reference UI at /api/docs and can be
 * downloaded directly by users.
 */

import { NextResponse } from "next/server";
import { json } from "@/lib/openapi";

export async function GET() {
  return new NextResponse(json(), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
