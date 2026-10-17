import { apiFetch } from './api'
import { ApiError } from './tasksApi'

export interface TaskDailyNote {
  task_id: string
  note_date: string
  note: string
  updated_at: string | null
}

export interface DailyTaskHistory {
  task_id: string
  name: string
  subject: string | null
  required_seconds: number
  logged_seconds: number
  has_target: boolean
  is_complete: boolean
  note: string
}

export interface ProfileDayDetails {
  date: string
  required_seconds: number
  logged_seconds: number
  is_complete: boolean
  tasks: DailyTaskHistory[]
}

export interface TaskProgressDay {
  date: string
  required_seconds: number
  logged_seconds: number
  has_target: boolean
  is_complete: boolean
  note: string
}

export interface TaskProgress {
  task_id: string
  task_name: string
  start_date: string
  end_date: string
  daily_minutes: number
  scheduled_days_elapsed: number
  days_with_activity: number
  days_target_met: number
  total_required_seconds: number
  total_logged_seconds: number
  progress_percent: number
  timeline_start_date: string
  timeline_end_date: string
  timeline_limited: boolean
  days: TaskProgressDay[]
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  return body as T
}

export async function getTaskDailyNote(taskId: string, onDate: string): Promise<TaskDailyNote> {
  const query = new URLSearchParams({ on_date: onDate })
  return request<TaskDailyNote>(`/api/v1/tasks/${encodeURIComponent(taskId)}/note?${query.toString()}`)
}

export async function saveTaskDailyNote(taskId: string, onDate: string, note: string): Promise<TaskDailyNote> {
  return request<TaskDailyNote>(`/api/v1/tasks/${encodeURIComponent(taskId)}/note`, {
    method: 'PUT',
    body: JSON.stringify({ note_date: onDate, note })
  })
}

export async function getTaskProgress(taskId: string): Promise<TaskProgress> {
  return request<TaskProgress>(`/api/v1/tasks/${encodeURIComponent(taskId)}/progress`)
}

export async function getProfileDayDetails(onDate: string): Promise<ProfileDayDetails> {
  const query = new URLSearchParams({ on_date: onDate })
  return request<ProfileDayDetails>(`/api/v1/profile/history/day?${query.toString()}`)
}
