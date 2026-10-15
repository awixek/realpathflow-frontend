import { motion } from 'framer-motion'
import { Task, TaskSession } from '../types'
import { formatHoursMinutes, minutesToLabel, weekdayLabel } from '../lib/time'

const STATUS_LABEL: Record<Task['status'], string> = {
  upcoming: 'Starts soon',
  ongoing: 'Ongoing',
  completed: 'Completed'
}

const STATUS_CLASS: Record<Task['status'], string> = {
  upcoming: 'text-mute border-ink-border',
  ongoing: 'text-flow border-flow/40',
  completed: 'text-paper/70 border-ink-border'
}

function frequencySummary(task: Task): string | null {
  const f = task.frequency
  if (f.frequency_type === 'WEEKLY' && f.excluded_weekdays.length > 0) {
    return `Skips ${f.excluded_weekdays.map(weekdayLabel).join(', ')}`
  }
  if (f.frequency_type === 'MONTHLY' && f.excluded_month_days.length > 0) {
    return `Skips day ${f.excluded_month_days.join(', ')} each month`
  }
  if (f.frequency_type === 'MANUAL') {
    return `${f.manual_active_dates.length} active date${f.manual_active_dates.length === 1 ? '' : 's'} only`
  }
  return null
}

export default function TaskCard({
  task,
  activeSession,
  loggedSecondsToday = 0,
  dailySnapshotAt = Date.now(),
  onStart,
  onPause,
  onResume,
  onTogglePublic,
  onEdit,
  onDelete,
  showTimerControls = true,
  busy
}: {
  task: Task
  activeSession: TaskSession | null
  loggedSecondsToday?: number
  dailySnapshotAt?: number
  onStart: (taskId: string) => void
  onPause: () => void
  onResume: () => void
  onTogglePublic?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  showTimerControls?: boolean
  busy: boolean
}) {
  const isThisTaskActive = activeSession?.task_id === task.id
  const isPaused = isThisTaskActive && activeSession?.status === 'PAUSED'
  const isRunning = isThisTaskActive && activeSession?.status === 'ACTIVE'
  const someOtherTaskRunning = activeSession?.status === 'ACTIVE' && !isThisTaskActive
  const freqNote = frequencySummary(task)
  const targetSeconds = task.daily_minutes * 60
  const secondsToday = Math.max(
    0,
    loggedSecondsToday + (isRunning ? Math.floor(Math.max(0, Date.now() - dailySnapshotAt) / 1000) : 0)
  )
  const progressPercent = targetSeconds > 0
    ? Math.min(100, Math.floor((secondsToday / targetSeconds) * 100))
    : 0

  return (
    <motion.div
      layout
      className={`relative flex flex-col gap-3 rounded-lg border p-4 ${
        isThisTaskActive ? 'border-flow shadow-[0_0_0_1px_rgba(62,207,126,0.3)]' : 'border-ink-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-paper">{task.name}</h3>
          {task.subject && <p className="text-sm text-mute">{task.subject}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] ${STATUS_CLASS[task.status]}`}>
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
        <span>{task.start_date} → {task.end_date}</span>
        <span>{minutesToLabel(task.daily_minutes)}/day</span>
        <span>{formatHoursMinutes(task.total_logged_seconds)} logged total</span>
        {freqNote && <span className="text-mute">{freqNote}</span>}
        {task.is_public && <span className="text-flow">Public</span>}
      </div>

      {task.status === 'ongoing' && showTimerControls && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-mute">
              Today: <span className="font-mono text-paper">{formatHoursMinutes(secondsToday)}</span>
              {' / '}{formatHoursMinutes(targetSeconds)}
              <span className="ml-2 font-semibold text-flow">{progressPercent}%</span>
            </span>
            <div className="flex items-center gap-2">
              {!isThisTaskActive && (
                <button
                  disabled={busy}
                  onClick={() => onStart(task.id)}
                  className="rounded-md border border-flow px-3 py-1.5 text-sm text-flow transition-colors hover:bg-flow hover:text-ink disabled:opacity-50"
                >
                  {someOtherTaskRunning ? 'Switch to task' : 'Start'}
                </button>
              )}
              {isRunning && (
                <button
                  disabled={busy}
                  onClick={onPause}
                  className="rounded-md border border-ink-border px-3 py-1.5 text-sm text-paper hover:border-flow disabled:opacity-50"
                >
                  Pause
                </button>
              )}
              {isPaused && (
                <button
                  disabled={busy}
                  onClick={onResume}
                  className="rounded-md border border-flow px-3 py-1.5 text-sm text-flow hover:bg-flow hover:text-ink disabled:opacity-50"
                >
                  Resume
                </button>
              )}
            </div>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-ink-panel"
            role="progressbar"
            aria-label={`${task.name} daily goal progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div className="h-full rounded-full bg-flow transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {(onTogglePublic || onEdit || onDelete) && (
        <div className="flex gap-3 border-t border-ink-border pt-2 text-xs">
          {onTogglePublic && (
            <button onClick={() => onTogglePublic(task)} className="text-mute hover:text-paper">
              {task.is_public ? 'Make private' : 'Make public'}
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(task)} className="text-mute hover:text-paper">
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(task)} className="text-mute hover:text-red-400">
              Delete
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
