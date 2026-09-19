import { apiFetch } from './api'
import { DEFAULT_FREQUENCY, Task, TaskFrequency, TaskSession } from '../types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options)
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.detail ?? `Request failed (${res.status})`
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status)
  }
  return body as T
}

export interface TaskDraft {
  name: string
  subject?: string
  start_date: string
  end_date: string
  daily_minutes: number
  is_public?: boolean
  frequency?: TaskFrequency
}

export async function listTasks(): Promise<Task[]> {
  const data = await request<{ tasks: Task[] }>('/api/v1/tasks')
  return data.tasks
}

export async function createTask(draft: TaskDraft): Promise<Task> {
  return request<Task>('/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify({ frequency: DEFAULT_FREQUENCY, is_public: false, ...draft })
  })
}

export async function updateTask(taskId: string, patch: Partial<TaskDraft>): Promise<Task> {
  return request<Task>(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  })
}

export async function deleteTask(taskId: string): Promise<void> {
  await request<void>(`/api/v1/tasks/${taskId}`, { method: 'DELETE' })
}

export async function getActiveSession(): Promise<TaskSession | null> {
  return request<TaskSession | null>('/api/v1/tasks/sessions/active')
}

export async function startSession(taskId: string): Promise<TaskSession> {
  return request<TaskSession>(`/api/v1/tasks/${taskId}/sessions/start`, { method: 'POST' })
}

export async function pauseSession(sessionId: string): Promise<TaskSession> {
  return request<TaskSession>(`/api/v1/tasks/sessions/${sessionId}/pause`, { method: 'POST' })
}

export async function resumeSession(sessionId: string): Promise<TaskSession> {
  return request<TaskSession>(`/api/v1/tasks/sessions/${sessionId}/resume`, { method: 'POST' })
}

export async function completeSession(sessionId: string): Promise<TaskSession> {
  return request<TaskSession>(`/api/v1/tasks/sessions/${sessionId}/complete`, { method: 'POST' })
}
