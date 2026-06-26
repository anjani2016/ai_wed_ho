import { NextResponse } from 'next/server'

const PRIMARY_URL = process.env.ML_PRIMARY_URL ?? "";       // EC2 (fast, judging period)
const FALLBACK_URL = process.env.ML_FALLBACK_URL ?? "";     // HF Spaces (free, permanent)

const PRIMARY_TIMEOUT_MS = 30_000;   // 30s — EC2 should respond fast
const FALLBACK_TIMEOUT_MS = 90_000;  // 90s — HF may wake from sleep

async function forwardRequest(
  baseUrl: string,
  body: ArrayBuffer,
  headers: Headers,
  timeoutMs: number
): Promise<Response> {
  const url = `${baseUrl}/inspect`;
  
  // Forward custom headers
  const reqHeaders: Record<string, string> = {};
  if (headers.has('x-user-role')) {
    reqHeaders['x-user-role'] = headers.get('x-user-role')!;
  }
  
  // Let the browser/server automatically set the correct boundary for multipart/form-data
  // Do NOT copy content-type header as it will break the form data boundary.

  return fetch(url, {
    method: 'POST',
    headers: reqHeaders,
    body: body,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function POST(req: Request) {
  // Read body as ArrayBuffer to forward it
  const bodyBuffer = await req.arrayBuffer();
  const headers = new Headers(req.headers);

  // ── Try primary (EC2) ─────────────────────────────────────────────────────
  if (PRIMARY_URL) {
    try {
      console.log(`[proxy/inspect] Trying primary: ${PRIMARY_URL}`);
      const res = await forwardRequest(PRIMARY_URL, bodyBuffer, headers, PRIMARY_TIMEOUT_MS);
      if (res.ok || res.status < 500) {
        const data = await res.json();
        return NextResponse.json(data, {
          status: res.status,
          headers: { "X-ML-Backend": "ec2-primary" },
        });
      }
    } catch (err) {
      console.warn(`[proxy/inspect] Primary ML backend (${PRIMARY_URL}) failed:`, (err as Error).message);
    }
  }

  // ── Fallback to HuggingFace Spaces ───────────────────────────────────────
  if (FALLBACK_URL) {
    try {
      console.log(`[proxy/inspect] Trying fallback: ${FALLBACK_URL}`);
      const res = await forwardRequest(FALLBACK_URL, bodyBuffer, headers, FALLBACK_TIMEOUT_MS);
      if (res.ok || res.status < 500) {
        const data = await res.json();
        return NextResponse.json(data, {
          status: res.status,
          headers: { "X-ML-Backend": "huggingface-fallback" },
        });
      }
    } catch (err) {
      console.warn(`[proxy/inspect] Fallback ML backend (${FALLBACK_URL}) failed:`, (err as Error).message);
    }
  }

  // ── Both unavailable ─────────────────────────────────────────────────────
  return NextResponse.json(
    {
      status: "error",
      message: "Both ML backends are unreachable.",
      primary: PRIMARY_URL || "not configured",
      fallback: FALLBACK_URL || "not configured",
    },
    { status: 503 }
  );
}
