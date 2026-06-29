import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('http://3.14.150.6:8000/license', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    const text = await res.text()
    return NextResponse.json({ success: true, status: res.status, text })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack })
  }
}
