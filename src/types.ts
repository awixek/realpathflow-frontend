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

/** Set only on the response that announces a server-side auto-stop -
 * 'target_reached' means today's daily target for that task was hit
 * (celebrate), 'stale_timeout' means the timer had been running
 * untouched for too long and was closed as a safety net (quiet notice,
 * no celebration). */
export type AutoStopReason = 'target_reached' | 'stale_timeout' | null

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
  auto_stop_reason?: AutoStopReason
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

export interface HistoryDay {
  date: string
  required_seconds: number
  logged_seconds: number
  is_active: boolean
  is_complete: boolean
}

export interface ProfileHistory {
  start_date: string
  end_date: string
  current_streak_days: number
  best_streak_days: number
  days: HistoryDay[]
}

export const DEFAULT_FREQUENCY: TaskFrequency = {
  frequency_type: 'NONE',
  excluded_weekdays: [],
  excluded_month_days: [],
  manual_active_dates: []
}


export interface PublicTask {
  id: string
  name: string
  subject: string | null
  start_date: string
  end_date: string
  daily_minutes: number
  frequency_type: FrequencyType
  status: TaskStatus
  created_at: string | null
}

export interface PublicSocialHandle {
  platform: string
  value: string
}

export interface PublicProfile {
  username: string
  avatar_url: string | null
  full_name: string | null
  location: string | null
  social_handles: PublicSocialHandle[]
  total_progress_seconds: number | null
  tasks: PublicTask[]
}

export interface SearchResult {
  username: string
  avatar_url: string | null
  full_name: string | null
  matched_subject: string | null
}
