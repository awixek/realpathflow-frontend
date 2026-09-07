import { apiFetch } from './api'
import { CompiledProposal } from './aiApi'

export class RoadmapPublishException extends Error {
  requestId?: string
  constructor(message: string, requestId?: string) {
    super(message)
    this.name = 'RoadmapPublishException'
    this.requestId = requestId
  }
}

export type AdaptiveStrategy = 'KEEP_DEADLINE' | 'REDUCE_SCOPE' | 'INCREASE_DAILY_TIME' | 'EXTEND_DEADLINE'

export interface RoadmapEditPreview {
  base_version: number
  approval_token: string
  can_apply: boolean
  edit_mode?: string
  explanation?: string
  proposal?: Record<string, unknown>
  adaptive?: {
    history_actual_seconds: number
    history_planned_seconds: number
    history_days_with_plans: number
    sustainable_daily_capacity_minutes: number
    remaining_hours: number
    deadline?: string | null
    required_daily_minutes?: number | null
  }
  changes: { text?: string; type?: string }[]
  impact?: {
    old_planned_minutes: number
    new_planned_minutes: number
    net_minutes: number
    daily_capacity_minutes: number
    remaining_minutes_after_edit: number
    deadline_infeasible: boolean
    deadline_explanation?: string
    removed_items: { title: string }[]
    added_items: { title: string }[]
    changed_dependencies: { id: string }[]
  }
}

async function postJson<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    const msg = detail?.detail ?? `Request failed (${res.status})`
    const reqId = detail?.request_id
    throw new RoadmapPublishException(msg, reqId)
  }
  return res.json()
}

export async function publishRoadmap(
  proposal: CompiledProposal,
  idempotencyKey?: string,
  options?: { startMode?: 'immediate' | 'tomorrow'; deadline?: string }
): Promise<{ id: string }> {
  const headers = idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined
  return postJson<{ id: string }>('/api/v1/roadmaps/publish', {
    proposal,
    start_mode: options?.startMode ?? 'immediate',
    deadline: options?.deadline || null
  }, headers)
}

export async function saveAndActivateProposal(proposal: CompiledProposal): Promise<{ id: string }> {
  const roadmap = await postJson<{ id: string }>('/api/v1/roadmaps', {
    title: proposal.title,
    description: proposal.description,
    execution_mode: 'TASK_BASED'
  })

  for (const task of proposal.tasks) {
    const createdTask = await postJson<{ id: string }>(`/api/v1/roadmaps/${roadmap.id}/tasks`, {
      title: task.title,
      order_index: task.order_index,
      planned_hours: task.planned_hours
    })

    const idMap = new Map<string, string>()
    for (const subtask of task.subtasks) {
      const dependencyRealId = subtask.dependency_subtask_id
        ? (idMap.get(subtask.dependency_subtask_id) ?? null)
        : null

      const created = await postJson<{ id: string }>(`/api/v1/roadmaps/tasks/${createdTask.id}/subtasks`, {
        title: subtask.title,
        order_index: subtask.order_index,
        planned_minutes: subtask.planned_minutes,
        is_sequential: subtask.is_sequential,
        dependency_subtask_id: dependencyRealId
      })
      idMap.set(subtask.id, created.id)
    }
  }

  await postJson(`/api/v1/roadmaps/${roadmap.id}/versions`, { schema_payload: proposal })
  return postJson(`/api/v1/roadmaps/${roadmap.id}/activate`, {})
}

export async function deleteRoadmap(roadmapId: string): Promise<void> {
  const res = await apiFetch(`/api/v1/roadmaps/${roadmapId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed (${res.status})`)
  }
}

export async function previewRoadmapEdit(roadmapId: string, prompt: string): Promise<RoadmapEditPreview> {
  return postJson<RoadmapEditPreview>(`/api/v1/roadmaps/${roadmapId}/edit/preview`, { prompt })
}

export async function previewAdaptiveReplan(
  roadmapId: string,
  strategy: AdaptiveStrategy,
  options?: { targetDailyMinutes?: number; targetDeadline?: string }
): Promise<RoadmapEditPreview> {
  return postJson<RoadmapEditPreview>(`/api/v1/roadmaps/${roadmapId}/adaptive/preview`, {
    strategy,
    target_daily_minutes: options?.targetDailyMinutes,
    target_deadline: options?.targetDeadline
  })
}

export async function applyRoadmapEdit(
  roadmapId: string,
  baseVersion: number,
  proposal: Record<string, unknown>,
  approvalToken: string,
  idempotencyKey?: string
): Promise<{ version_number: number }> {
  const headers = idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined
  return postJson<{ version_number: number }>(`/api/v1/roadmaps/${roadmapId}/edit/apply`, {
    base_version: baseVersion,
    proposal,
    approval_token: approvalToken
  }, headers)
}

export async function fetchRoadmapVersions(roadmapId: string): Promise<{ version_number: number; schema_payload: Record<string, unknown> }[]> {
  const res = await apiFetch(`/api/v1/roadmaps/${roadmapId}/versions`)
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Failed to fetch roadmap versions (${res.status})`)
  }
  return res.json()
}

export async function restoreRoadmapVersion(
  roadmapId: string,
  version: number,
  idempotencyKey?: string
): Promise<{ version_number: number }> {
  const headers = idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined
  return postJson<{ version_number: number }>(`/api/v1/roadmaps/${roadmapId}/versions/${version}/restore`, {}, headers)
}
