/**
 * app/api/proxy/[...path]/route.ts
 *
 * Transparent proxy with automatic failover:
 *   Primary   → EC2 t3.large (fast, used during hackathon judging period)
 *   Fallback  → HuggingFace Spaces (free, permanent, for long-term visibility)
 *
 * Switch backends by updating env vars — no code changes needed:
 *   During judging:  ML_PRIMARY_URL=http://<ec2-ip>:8000   ML_FALLBACK_URL=https://anjani2016-weld.hf.space
 *   After judging:   ML_PRIMARY_URL=""                     ML_FALLBACK_URL=https://anjani2016-weld.hf.space
 */

import { NextRequest, NextResponse } from "next/server";

const PRIMARY_URL = process.env.ML_PRIMARY_URL ?? "";       // EC2 (fast, judging period)
const FALLBACK_URL = process.env.ML_FALLBACK_URL ?? "";     // HF Spaces (free, permanent)

const PRIMARY_TIMEOUT_MS = 30_000;   // 30s — EC2 should respond fast
const FALLBACK_TIMEOUT_MS = 90_000;  // 90s — HF may wake from sleep

async function forwardRequest(
  baseUrl: string,
  path: string,
  request: NextRequest,
  timeoutMs: number
): Promise<Response> {
  const url = `${baseUrl}/${path}`;
  const init: RequestInit = {
    method: request.method,
    headers: Object.fromEntries(
      [...request.headers.entries()].filter(
        ([k]) => !["host", "connection", "transfer-encoding"].includes(k.toLowerCase())
      )
    ),
    signal: AbortSignal.timeout(timeoutMs),
  };

  // Forward body for POST/PUT/PATCH
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  return fetch(url, init);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, await params);
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  const path = params.path?.join("/") ?? "";

  // ── Try primary (EC2) ─────────────────────────────────────────────────────
  if (PRIMARY_URL) {
    try {
      const res = await forwardRequest(PRIMARY_URL, path, request.clone(), PRIMARY_TIMEOUT_MS);
      if (res.ok || res.status < 500) {
        return new NextResponse(res.body, {
          status: res.status,
          headers: {
            "Content-Type": res.headers.get("Content-Type") ?? "application/json",
            "X-ML-Backend": "ec2-primary",
          },
        });
      }
    } catch (err) {
      console.warn(`[proxy] Primary ML backend (${PRIMARY_URL}) failed:`, (err as Error).message);
    }
  }

  // ── Fallback to HuggingFace Spaces ───────────────────────────────────────
  if (FALLBACK_URL) {
    try {
      const res = await forwardRequest(FALLBACK_URL, path, request.clone(), FALLBACK_TIMEOUT_MS);
      return new NextResponse(res.body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("Content-Type") ?? "application/json",
          "X-ML-Backend": "huggingface-fallback",
        },
      });
    } catch (err) {
      console.warn(`[proxy] Fallback ML backend (${FALLBACK_URL}) failed:`, (err as Error).message);
    }
  }

  // ── Both unavailable ─────────────────────────────────────────────────────
  return NextResponse.json(
    {
      status: "ml_unavailable",
      message:
        "Both ML backends are unreachable. " +
        "Run locally: uvicorn src.api.server:app --reload --port 8000 " +
        "then set ML_PRIMARY_URL=http://localhost:8000",
      primary: PRIMARY_URL || "not configured",
      fallback: FALLBACK_URL || "not configured",
    },
    { status: 503 }
  );
}
