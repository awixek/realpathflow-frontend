import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export async function apiFetch(path: string, options: RequestInit = {}) {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new TypeError('Network request failed')
  }
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options)
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw Object.assign(new Error(data?.detail || 'Request failed'), { status: response.status })
  return data as T
}
