export type SubtaskStatus = 'pending' | 'active' | 'done'

export interface Subtask {
  id: string
  title: string
  status: SubtaskStatus
  estimatedMinutes: number
}

export type TaskStatus = 'not_started' | 'ready' | 'in_progress' | 'paused' | 'done'

export interface MainTask {
  id: string
  title: string
  status: TaskStatus
  timeShare: number // this task's weight toward the day's overall % (0-1, all tasks sum to 1)
  subtasks: Subtask[]
}

/** One day's record for the profile heatmap. */
export interface DayRecord {
  date: string // YYYY-MM-DD
  hoursLogged: number
  completionPct: number // 0-100, drives the liquid fill level for that day's cell
}
