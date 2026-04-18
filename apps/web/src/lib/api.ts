import 'server-only'

const INTERNAL_API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${INTERNAL_API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, { cache: 'no-store', ...init })
  if (!res.ok) {
    throw new Error(`API ${res.status} for ${path}`)
  }
  return (await res.json()) as T
}
