import { apiFetch } from './api'
import { DailyProgress, ProfileHistory, ProfileSummary } from '../types'
import { ApiError } from './tasksApi'

async function request<T>(path: string): Promise<T> {
  const res = await apiFetch(path)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  return body as T
}

/** Defaults to today on the server's IST calendar when no date is passed. */
export async function getDailyProgress(onDate?: string): Promise<DailyProgress> {
  const query = onDate ? `?on_date=${onDate}` : ''
  return request<DailyProgress>(`/api/v1/daily${query}`)
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  return request<ProfileSummary>('/api/v1/profile')
}


export async function getProfileHistory(startDate?: string, endDate?: string): Promise<ProfileHistory> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  const query = params.toString() ? `?${params.toString()}` : ''
  return request<ProfileHistory>(`/api/v1/profile/history${query}`)
}


export interface CurrentUserProfile {
  id: string
  email: string | null
  profile: { username: string; full_name: string | null } | null
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  return request<CurrentUserProfile>('/api/v1/me')
}
