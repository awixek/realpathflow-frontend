import { apiFetch } from './api'
import { MainTask, Subtask, SubtaskStatus, TaskStatus } from '../types'

interface RawSubtask {
  id: string
  task_id: string
  title: string
  order_index: number
  planned_minutes: number
  is_completed: boolean
  status: SubtaskStatus
}

interface RawTask {
  id: string
  title: string
  order_index: number
  status: TaskStatus
  time_share: number
  subtasks: RawSubtask[]
}

export interface SessionResponse {
  id: string
  subtask_id: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  started_at: string | null
  paused_at: string | null
  ended_at: string | null
  accumulated_seconds: number
}

export interface DashboardResponse {
  roadmap: { id: string; title: string; created_at: string } | null
  day_percent: number
  tasks: RawTask[]
  active_session: SessionResponse | null
}

export interface DashboardView {
  roadmapId: string | null
  roadmapTitle: string | null
  roadmapCreatedAt: string | null
  dayPercent: number
  tasks: MainTask[]
  activeSession: SessionResponse | null
}

function mapSubtask(raw: RawSubtask): Subtask {
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    estimatedMinutes: raw.planned_minutes
  }
}

function mapTask(raw: RawTask): MainTask {
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    timeShare: raw.time_share,
    subtasks: raw.subtasks.map(mapSubtask)
  }
}

export async function fetchDashboard(): Promise<DashboardView> {
  const res = await apiFetch('/api/v1/dashboard/today')
  if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`)
  const data: DashboardResponse = await res.json()

  return {
    roadmapId: data.roadmap?.id ?? null,
    roadmapTitle: data.roadmap?.title ?? null,
    roadmapCreatedAt: data.roadmap?.created_at ?? null,
    dayPercent: data.day_percent,
    tasks: data.tasks.map(mapTask),
    activeSession: data.active_session
  }
}

async function postJson(path: string, body?: unknown): Promise<SessionResponse> {
  const res = await apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export function startSession(subtaskId: string) {
  return postJson('/api/v1/execution/sessions', { subtask_id: subtaskId })
}

export function pauseSession(sessionId: string) {
  return postJson(`/api/v1/execution/sessions/${sessionId}/pause`)
}

export function resumeSession(sessionId: string) {
  return postJson(`/api/v1/execution/sessions/${sessionId}/resume`)
}

export function completeSession(sessionId: string) {
  return postJson(`/api/v1/execution/sessions/${sessionId}/complete`)
}

/** Seconds elapsed in a session right now, given the server's authoritative accumulated_seconds. */
export function computeElapsedSeconds(session: SessionResponse, nowMs: number): number {
  if (session.status !== 'ACTIVE' || !session.started_at) {
    return session.accumulated_seconds
  }
  const sinceStart = (nowMs - new Date(session.started_at).getTime()) / 1000
  return session.accumulated_seconds + Math.max(0, sinceStart)
}
