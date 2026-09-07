import { apiFetch } from './api'

export interface UserPreferences {
  timezone: string
  daily_capacity_minutes: number
}

export async function fetchPreferences(): Promise<UserPreferences> {
  const res = await apiFetch('/api/v1/preferences')
  if (!res.ok) throw new Error(`Failed to load preferences (${res.status})`)
  return res.json()
}

export async function updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await apiFetch('/api/v1/preferences', {
    method: 'PATCH',
    body: JSON.stringify(prefs)
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Failed to save preferences (${res.status})`)
  }
  return res.json()
}
