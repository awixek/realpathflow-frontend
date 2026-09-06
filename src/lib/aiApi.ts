import { apiFetch } from './api'

export interface AIQuestion {
  id: string
  question: string
}

export interface CompiledSubtask {
  id: string
  title: string
  order_index: number
  planned_minutes: number
  is_sequential: boolean
  dependency_subtask_id: string | null
}

export interface CompiledTask {
  title: string
  order_index: number
  planned_hours: number
  subtasks: CompiledSubtask[]
}

export interface CompiledProposal {
  title: string
  description: string
  tasks: CompiledTask[]
  total_planned_hours: number
  metadata?: Record<string, unknown>
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export async function fetchDiscoveryQuestions(requirements: string): Promise<AIQuestion[]> {
  const data = await postJson<{ questions: AIQuestion[] }>('/api/v1/ai/questions', { requirements })
  return data.questions
}

export async function compileRoadmapProposal(
  requirements: string,
  answers: Record<string, string>
): Promise<CompiledProposal> {
  const data = await postJson<{ status: string; compiled_data: CompiledProposal }>('/api/v1/ai/compile', {
    requirements,
    answers
  })
  return data.compiled_data
}
