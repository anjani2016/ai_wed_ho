// Shared helpers for the backend proxy routes.
// The frontend forwards the chosen backend base URL via the `x-api-base` header
// so a single deployment can target any FastAPI instance (e.g. localhost:8000).

export function backendBase(req: Request): string {
  let base = req.headers.get('x-api-base') ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  if (base.startsWith('/')) {
    const origin = new URL(req.url).origin
    base = `${origin}${base}`
  }
  return base
}

export function forwardHeaders(req: Request): HeadersInit {
  const role = req.headers.get('x-user-role') ?? 'Inspector'
  return { 'x-user-role': role }
}

// Short timeout so an unreachable backend fails fast and the client can fall
// back to demo data without a long hang.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 4000,
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}
