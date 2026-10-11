import { apiFetch } from './api'
import { ApiError } from './tasksApi'
import { PublicProfile, SearchResult } from '../types'

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const res = await apiFetch(`/api/v1/public/profile/${encodeURIComponent(username)}`)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  return body as PublicProfile
}

export async function searchProfiles(query: string): Promise<SearchResult[]> {
  const res = await apiFetch(`/api/v1/public/search?q=${encodeURIComponent(query)}`)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  return (body?.results ?? []) as SearchResult[]
}
