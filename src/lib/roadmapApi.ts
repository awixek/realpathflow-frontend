import { apiFetch } from './api'
import { CompiledProposal } from './aiApi'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed (${res.status})`)
  }
  return res.json()
}

/**
 * Saves a compiled AI proposal as a real roadmap and activates it:
 * create roadmap -> create each task -> create each task's subtasks
 * (remapping the AI's synthetic dependency ids to the real created ids)
 * -> save the proposal itself as version 1 -> activate.
 */
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

    const idMap = new Map<string, string>() // AI's synthetic subtask id -> real created id
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
