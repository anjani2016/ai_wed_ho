import { NextResponse } from 'next/server'
import { backendBase, fetchWithTimeout, forwardHeaders } from '../_lib'

export async function GET(req: Request) {
  const base = backendBase(req)
  try {
    const res = await fetchWithTimeout(`${base}/records`, {
      headers: forwardHeaders(req),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    // Backend offline — return empty so the client keeps its mock dataset.
    return NextResponse.json(
      { status: 'offline', records: [] },
      { status: 503 },
    )
  }
}
