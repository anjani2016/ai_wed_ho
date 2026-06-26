import { NextResponse } from 'next/server'
import { backendBase, fetchWithTimeout, forwardHeaders } from '../_lib'

export async function GET(req: Request) {
  const base = backendBase(req)
  try {
    const res = await fetchWithTimeout(`${base}/license`, {
      headers: forwardHeaders(req),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    // Backend offline — report unhealthy so the client switches to demo mode.
    return NextResponse.json(
      { status: 'offline', message: 'Backend unreachable' },
      { status: 503 },
    )
  }
}
