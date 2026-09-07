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
  server_now?: string | null
  elapsed_seconds?: number | null
  daily_target_seconds?: number | null
  daily_remaining_seconds?: number | null
}

export interface DailyPlanItem {
  id: string
  subtask_id: string
  task_id: string
  task_title: string
  subtask_title: string
  order_index: number
  allocated_seconds: number
  planned_seconds_remaining: number
  actual_seconds: number
  remaining_seconds: number
  is_completed: boolean
  blocked: boolean
}

export interface DailyPlan {
  id: string
  roadmap_id: string
  plan_date: string
  timezone: string
  capacity_seconds: number
  allocated_seconds: number
  remaining_capacity_seconds: number
  items: DailyPlanItem[]
  generated: boolean
}

export interface AdaptiveAnalysis {
  roadmap_id: string
  date: string
  timezone: string
  configured_daily_capacity_minutes: number
  sustainable_daily_capacity_minutes: number
  sustainable_capacity_source: string
  history_days_considered: number
  history_days_with_plans: number
  history_days_with_activity: number
  median_actual_minutes: number
  history_planned_seconds: number
  history_actual_seconds: number
  average_planned_minutes: number
  average_actual_minutes: number
  adherence_ratio: number
  remaining_seconds: number
  remaining_hours: number
  deadline: string | null
  days_available: number | null
  required_daily_minutes: number | null
  feasible_at_configured_capacity: boolean | null
  feasible_at_sustainable_capacity: boolean | null
  projected_days_at_sustainable_capacity: number | null
  current_streak: number
  signal: string
  recommendation: string | null
}

export interface DashboardResponse {
  roadmap: { id: string; title: string; created_at?: string; start_date?: string | null; deadline?: string | null } | null
  date: string
  timezone: string
  daily_capacity_seconds: number
  plan: DailyPlan | null
  total_remaining_seconds: number
  completed_seconds: number
  remaining_seconds_today: number
  recommended_next_task: DailyPlanItem | null
  feasibility_days?: number | null
  deadline_days?: number | null
  required_daily_seconds?: number | null
  deadline_infeasible?: boolean | null
  scheduled_for?: string | null
  day_percent: number
  daily_completed?: boolean
  daily_qualified?: boolean
  current_streak?: number
  tasks: RawTask[]
  active_session: SessionResponse | null
  adaptive?: AdaptiveAnalysis | null
}

export interface DashboardView {
  roadmapId: string | null
  roadmapTitle: string | null
  roadmapCreatedAt: string | null
  roadmapStartDate: string | null
  roadmapDeadline: string | null
  date: string
  timezone: string
  dailyCapacitySeconds: number
  plan: DailyPlan | null
  totalRemainingSeconds: number
  completedSeconds: number
  remainingSecondsToday: number
  recommendedNextTask: DailyPlanItem | null
  feasibilityDays: number | null
  deadlineDays: number | null
  requiredDailySeconds: number | null
  deadlineInfeasible: boolean
  scheduledFor: string | null
  dayPercent: number
  dailyCompleted: boolean
  dailyQualified: boolean
  currentStreak: number
  tasks: MainTask[]
  activeSession: SessionResponse | null
  adaptive: AdaptiveAnalysis | null
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
    roadmapStartDate: data.roadmap?.start_date ?? null,
    roadmapDeadline: data.roadmap?.deadline ?? null,
    date: data.date,
    timezone: data.timezone,
    dailyCapacitySeconds: data.daily_capacity_seconds,
    plan: data.plan,
    totalRemainingSeconds: data.total_remaining_seconds,
    completedSeconds: data.completed_seconds,
    remainingSecondsToday: data.remaining_seconds_today,
    recommendedNextTask: data.recommended_next_task,
    feasibilityDays: data.feasibility_days ?? null,
    deadlineDays: data.deadline_days ?? null,
    requiredDailySeconds: data.required_daily_seconds ?? null,
    deadlineInfeasible: Boolean(data.deadline_infeasible),
    scheduledFor: data.scheduled_for ?? null,
    dayPercent: data.day_percent,
    dailyCompleted: Boolean(data.daily_completed),
    dailyQualified: Boolean(data.daily_qualified),
    currentStreak: data.current_streak ?? 0,
    tasks: data.tasks.map(mapTask),
    activeSession: data.active_session,
    adaptive: data.adaptive ?? null
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
  const idempotencyKey = crypto.randomUUID()
  return postJson('/api/v1/execution/sessions', { subtask_id: subtaskId, idempotency_key: idempotencyKey })
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
  // Server elapsed_seconds is authoritative. The browser only interpolates the
  // display between server snapshots; it never sends this value back.
  if (session.elapsed_seconds != null) {
    if (session.status !== 'ACTIVE' || !session.server_now) return session.elapsed_seconds
    const sinceServerSnapshot = (nowMs - new Date(session.server_now).getTime()) / 1000
    return session.elapsed_seconds + Math.max(0, sinceServerSnapshot)
  }
  return session.accumulated_seconds
}
