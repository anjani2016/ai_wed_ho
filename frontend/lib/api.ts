import type { InspectionParams, InspectResponse, InspectionRecord } from './types'
import { getApiUrl, getRole } from './config'

// All requests go through the Next.js proxy routes at /api/proxy/*.
// The backend base URL is forwarded via the x-api-base header.
function proxyHeaders(): HeadersInit {
  return {
    'x-api-base': getApiUrl(),
    'x-user-role': getRole(),
  }
}

export async function checkLicense(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/proxy/license', { headers: proxyHeaders() })
    const data = await res.json()
    return { ok: res.ok && data?.status === 'ok', message: data?.message ?? 'Connected' }
  } catch {
    return { ok: false, message: 'Backend unreachable' }
  }
}

export async function runInspection(
  file: File,
  params: InspectionParams,
): Promise<InspectResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('model_path', params.model)
  form.append('thickness', String(params.thickness))
  form.append('material', params.material)
  form.append('regulatory_code', params.regulatory_code)
  form.append('app_type', params.app_type)
  form.append('usage', params.usage)
  form.append('client_spec', params.client_spec)

  const res = await fetch('/api/proxy/inspect', {
    method: 'POST',
    headers: proxyHeaders(),
    body: form,
  })
  if (!res.ok) throw new Error(`Inspection failed (${res.status})`)
  return res.json()
}

export async function fetchRecords(): Promise<InspectionRecord[]> {
  const res = await fetch('/api/proxy/records', { headers: proxyHeaders() })
  if (!res.ok) throw new Error(`Failed to fetch records (${res.status})`)
  const data = await res.json()
  return data.records ?? []
}

export async function submitFeedback(
  reportId: string,
  comments: string,
  role: string,
): Promise<void> {
  const form = new FormData()
  form.append('comments', comments)
  form.append('role', role)
  const res = await fetch(`/api/proxy/records/${reportId}/feedback`, {
    method: 'POST',
    headers: proxyHeaders(),
    body: form,
  })
  if (!res.ok) throw new Error(`Failed to submit feedback (${res.status})`)
}
