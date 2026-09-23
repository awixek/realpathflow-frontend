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
    throw new Error(
      `Network/CORS error contacting the RealPathFlow API at ${API_BASE_URL}. ` +
        'Check VITE_API_BASE_URL and the Railway ALLOWED_ORIGINS value.'
    )
  }
}
