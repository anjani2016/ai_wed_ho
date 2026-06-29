import { NextResponse } from 'next/server';

// ── Environment Configuration ────────────────────────────────────────────────
// The backend to use in development (if configured via UI or env)
const backendBase = (req: Request) => {
  return req.headers.get('x-ml-backend') || process.env.NEXT_PUBLIC_API_URL || null;
};

const PRIMARY_URL = process.env.ML_PRIMARY_URL;     // EC2 (Fast)
const FALLBACK_URL = process.env.ML_FALLBACK_URL;   // HuggingFace Spaces (Slow)

const LOCAL_TIMEOUT_MS = 15_000;     // 15s
const PRIMARY_TIMEOUT_MS = 30_000;   // 30s — EC2 should respond fast
const FALLBACK_TIMEOUT_MS = 90_000;  // 90s — HF may wake from sleep

export async function POST(req: Request) {
  // Read body as FormData to properly preserve the multipart boundaries when forwarding
  // ArrayBuffer strips or corrupts the boundary in Next.js Serverless environments
  const formData = await req.formData();
  
  // Forward custom headers, specifically the x-user-role
  const reqHeaders: Record<string, string> = {};
  if (req.headers.has('x-user-role')) {
    reqHeaders['x-user-role'] = req.headers.get('x-user-role')!;
  }
  if (req.headers.has('Bypass-Tunnel-Reminder')) {
    reqHeaders['Bypass-Tunnel-Reminder'] = req.headers.get('Bypass-Tunnel-Reminder')!;
  }
  // Note: Do NOT manually forward Content-Type. fetch() will automatically generate
  // a new Content-Type header with the correct boundary for the forwarded formData.

  const forward = async (url: string, timeout: number) => {
    return fetch(`${url}/inspect`, {
      method: 'POST',
      headers: reqHeaders,
      body: formData,
      signal: AbortSignal.timeout(timeout),
    });
  };

  // ── Try Configured/Local Backend first ──────────────────────────────────────
  const localUrl = backendBase(req);
  if (localUrl) {
    try {
      console.log(`[proxy/inspect] Trying local/configured backend: ${localUrl}`);
      const res = await forward(localUrl, LOCAL_TIMEOUT_MS);
      if (res.ok || res.status < 500) {
        const data = await res.json();
        return NextResponse.json(data, {
          status: res.status,
          headers: { "X-ML-Backend": "local-backend" },
        });
      }
    } catch (err) {
      console.warn(`[proxy/inspect] Local/configured backend (${localUrl}) failed:`, (err as Error).message);
    }
  }

  // ── Try primary (EC2) ─────────────────────────────────────────────────────
  if (PRIMARY_URL) {
    try {
      console.log(`[proxy/inspect] Trying primary: ${PRIMARY_URL}`);
      const res = await forward(PRIMARY_URL, PRIMARY_TIMEOUT_MS);
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
      const res = await forward(FALLBACK_URL, FALLBACK_TIMEOUT_MS);
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

  // ── All failed ────────────────────────────────────────────────────────────
  console.error('[proxy/inspect] All ML backends failed or timed out.');
  return NextResponse.json(
    { detail: "ML Backend unavailable. Please try again later." },
    { status: 503 }
  );
}
