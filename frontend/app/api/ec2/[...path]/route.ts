import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxy(request, resolvedParams.path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxy(request, resolvedParams.path)
}

async function handleProxy(request: NextRequest, pathArray: string[]) {
  const targetUrl = `http://3.14.150.6:8000/${pathArray.join('/')}`
  
  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: new Headers(request.headers),
    }

    // Pass along the body for POST requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('multipart/form-data')) {
        // For multipart/form-data, Next.js requires reading formData
        const formData = await request.formData()
        fetchOptions.body = formData
        // Remove content-type so fetch can set it with the correct boundary
        const newHeaders = new Headers(request.headers)
        newHeaders.delete('content-type')
        fetchOptions.headers = newHeaders
      } else {
        fetchOptions.body = await request.blob()
      }
    }

    // Remove host header so it uses the target's host
    const headers = new Headers(fetchOptions.headers)
    headers.delete('host')
    fetchOptions.headers = headers

    const response = await fetch(targetUrl, fetchOptions)

    // Forward the response back to the client
    const responseHeaders = new Headers(response.headers)
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to connect to EC2 backend' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
