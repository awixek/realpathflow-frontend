import { apiFetch } from './api'
import { DailyProgress, ProfileSummary } from '../types'

async function request<T>(path: string): Promise<T> {
  const res = await apiFetch(path)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return body as T
}

/** Defaults to today (server's UTC date) when no date is passed. */
export async function getDailyProgress(onDate?: string): Promise<DailyProgress> {
  const query = onDate ? `?on_date=${onDate}` : ''
  return request<DailyProgress>(`/api/v1/daily${query}`)
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  return request<ProfileSummary>('/api/v1/profile')
}
