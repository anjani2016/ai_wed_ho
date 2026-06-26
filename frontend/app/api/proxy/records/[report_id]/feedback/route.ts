import { NextResponse } from 'next/server'
import { backendBase, fetchWithTimeout, forwardHeaders } from '../../../_lib'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ report_id: string }> },
) {
  const { report_id } = await params
  const base = backendBase(req)
  const form = await req.formData()
  try {
    const res = await fetchWithTimeout(
      `${base}/records/${report_id}/feedback`,
      {
        method: 'POST',
        headers: forwardHeaders(req),
        body: form,
      },
    )
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    // Backend offline — acknowledge so the client updates state optimistically.
    return NextResponse.json(
      { status: 'offline', report_id, message: 'Saved locally (demo mode)' },
      { status: 503 },
    )
  }
}
