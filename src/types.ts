export type FrequencyType = 'NONE' | 'WEEKLY' | 'MONTHLY' | 'MANUAL'

export interface TaskFrequency {
  frequency_type: FrequencyType
  excluded_weekdays: number[] // 0=Sunday .. 6=Saturday
  excluded_month_days: number[] // 1-31
  manual_active_dates: string[] // YYYY-MM-DD, only these dates count
}

export type TaskStatus = 'upcoming' | 'ongoing' | 'completed'

export interface Task {
  id: string
  name: string
  subject: string | null
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  daily_minutes: number
  is_public: boolean
  status: TaskStatus
  frequency: TaskFrequency
  total_logged_seconds: number
  created_at: string | null
}

export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED'

export interface TaskSession {
  id: string
  task_id: string
  status: SessionStatus
  session_date: string
  started_at: string
  paused_at: string | null
  completed_at: string | null
  accumulated_seconds: number
  elapsed_seconds: number
}

export interface DailyTaskBreakdown {
  task_id: string
  name: string
  required_seconds: number
  logged_seconds: number
}

export interface DailyProgress {
  date: string
  required_seconds: number
  logged_seconds: number
  is_complete: boolean
  tasks: DailyTaskBreakdown[]
}

export interface ProfileSummary {
  total_logged_seconds: number
  ongoing_count: number
  completed_count: number
  upcoming_count: number
  ongoing_tasks: Task[]
  completed_tasks: Task[]
  upcoming_tasks: Task[]
}

export const DEFAULT_FREQUENCY: TaskFrequency = {
  frequency_type: 'NONE',
  excluded_weekdays: [],
  excluded_month_days: [],
  manual_active_dates: []
}
