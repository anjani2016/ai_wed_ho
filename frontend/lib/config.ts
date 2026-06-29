// Backend API base URL. Reads from NEXT_PUBLIC_API_URL, defaults to local FastAPI.
export const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Read-only environment values surfaced in Settings.
export const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION ?? 'us-east-1'
export const DYNAMODB_TABLE =
  process.env.NEXT_PUBLIC_DYNAMODB_TABLE ?? 'weldvision-inspections'

const STORAGE_KEY = 'weldvision:apiUrl'
const ROLE_KEY = 'weldvision:role'

export type UserRole =
  | 'Inspector'
  | 'Performer'
  | 'Supervisor'
  | 'Admin'
  | 'Auditor'

export function getApiUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_API_URL
  let url = window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_API_URL
  if (url && !url.startsWith('/') && !/^https?:\/\//i.test(url)) {
    // If it looks like an IP address or localhost, use http, otherwise https
    url = url.includes('localhost') || url.match(/^\d{1,3}\./) ? `http://${url}` : `https://${url}`
  }
  return url.replace(/\/$/, '')
}

export function setApiUrl(url: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, url)
}

export function getRole(): UserRole {
  if (typeof window === 'undefined') return 'Inspector'
  return (window.localStorage.getItem(ROLE_KEY) as UserRole) ?? 'Inspector'
}

export function setRole(role: UserRole) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ROLE_KEY, role)
}
