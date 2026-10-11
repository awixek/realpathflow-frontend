import { useEffect, useState } from 'react'
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


export interface SocialHandle {
  platform: string
  value: string
}

export interface ProfileFields {
  username: string | null
  full_name: string | null
  location: string | null
  social_handles: SocialHandle[]
  avatar_url: string | null
  is_name_public: boolean
  is_location_public: boolean
  is_socials_public: boolean
  is_tasks_public: boolean
  is_progress_public: boolean
}

export interface CurrentUserProfile {
  id: string
  email: string | null
  profile: ProfileFields | null
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  return request<CurrentUserProfile>('/api/v1/me')
}

export interface ProfileUpdateDraft {
  username?: string
  full_name?: string | null
  location?: string | null
  social_handles?: SocialHandle[]
  is_name_public?: boolean
  is_location_public?: boolean
  is_socials_public?: boolean
  is_tasks_public?: boolean
  is_progress_public?: boolean
}

export async function updateCurrentUserProfile(patch: ProfileUpdateDraft): Promise<CurrentUserProfile> {
  const res = await apiFetch('/api/v1/me', { method: 'PATCH', body: JSON.stringify(patch) })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  invalidateCurrentUserProfileCache()
  return body as CurrentUserProfile
}

export async function uploadAvatar(file: Blob): Promise<CurrentUserProfile> {
  const form = new FormData()
  form.append('file', file, 'avatar.jpg')
  const res = await apiFetch('/api/v1/me/avatar', { method: 'POST', body: form })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  invalidateCurrentUserProfileCache()
  return body as CurrentUserProfile
}

export async function removeAvatar(): Promise<CurrentUserProfile> {
  const res = await apiFetch('/api/v1/me/avatar', { method: 'DELETE' })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  invalidateCurrentUserProfileCache()
  return body as CurrentUserProfile
}

// Module-level cache: identity rarely changes mid-session, and components
// like the nav drawer mount/unmount every time they open - without this,
// every open would re-fetch /api/v1/me for no reason.
let cachedProfile: CurrentUserProfile | null = null
let profileInFlight: Promise<CurrentUserProfile> | null = null

export function invalidateCurrentUserProfileCache() {
  cachedProfile = null
}

/** Cached, hook-friendly version of getCurrentUserProfile(). Call
 * invalidateCurrentUserProfileCache() (done automatically by
 * updateCurrentUserProfile) after anything that changes it. */
export function useCurrentUserProfile(): CurrentUserProfile | null {
  const [me, setMe] = useState<CurrentUserProfile | null>(cachedProfile)

  useEffect(() => {
    if (cachedProfile) {
      setMe(cachedProfile)
      return
    }
    const request = profileInFlight ?? getCurrentUserProfile()
    profileInFlight = request
    request
      .then((result) => {
        cachedProfile = result
        setMe(result)
      })
      .catch(() => {
        // Not fatal - callers fall back to showing nothing/email.
      })
      .finally(() => {
        profileInFlight = null
      })
  }, [])

  return me
}
