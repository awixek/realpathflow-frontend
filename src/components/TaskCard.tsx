import { motion } from 'framer-motion'
import { Task, TaskSession } from '../types'
import { formatClock, formatHoursMinutes, minutesToLabel, weekdayLabel } from '../lib/time'

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
  liveElapsedSeconds,
  onStart,
  onPause,
  onResume,
  onComplete,
  onTogglePublic,
  onDelete,
  busy
}: {
  task: Task
  activeSession: TaskSession | null
  liveElapsedSeconds: number
  onStart: (taskId: string) => void
  onPause: (sessionId: string) => void
  onResume: (sessionId: string) => void
  onComplete: (sessionId: string) => void
  onTogglePublic?: (task: Task) => void
  onDelete?: (task: Task) => void
  busy: boolean
}) {
  const isThisTaskActive = activeSession?.task_id === task.id
  const isPaused = isThisTaskActive && activeSession?.status === 'PAUSED'
  const isRunning = isThisTaskActive && activeSession?.status === 'ACTIVE'
  const someOtherTaskRunning = activeSession != null && !isThisTaskActive
  const freqNote = frequencySummary(task)

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

      {task.status === 'ongoing' && (
        <div className="flex flex-wrap items-center gap-2">
          {isRunning && (
            <span className="font-mono text-sm text-flow">{formatClock(liveElapsedSeconds)}</span>
          )}
          {!isThisTaskActive && !someOtherTaskRunning && (
            <button
              disabled={busy}
              onClick={() => onStart(task.id)}
              className="rounded-md border border-flow px-3 py-1.5 text-sm text-flow transition-colors hover:bg-flow hover:text-ink disabled:opacity-50"
            >
              Start
            </button>
          )}
          {isRunning && (
            <>
              <button
                disabled={busy}
                onClick={() => onPause(activeSession!.id)}
                className="rounded-md border border-ink-border px-3 py-1.5 text-sm text-paper hover:border-flow disabled:opacity-50"
              >
                Pause
              </button>
              <button
                disabled={busy}
                onClick={() => onComplete(activeSession!.id)}
                className="rounded-md bg-flow px-3 py-1.5 text-sm font-medium text-ink hover:bg-flow/90 disabled:opacity-50"
              >
                Stop
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button
                disabled={busy}
                onClick={() => onResume(activeSession!.id)}
                className="rounded-md border border-flow px-3 py-1.5 text-sm text-flow hover:bg-flow hover:text-ink disabled:opacity-50"
              >
                Resume
              </button>
              <button
                disabled={busy}
                onClick={() => onComplete(activeSession!.id)}
                className="rounded-md border border-ink-border px-3 py-1.5 text-sm text-paper hover:border-flow disabled:opacity-50"
              >
                Stop
              </button>
            </>
          )}
          {someOtherTaskRunning && (
            <span className="text-xs text-mute">Finish the running timer first</span>
          )}
        </div>
      )}

      {(onTogglePublic || onDelete) && (
        <div className="flex gap-3 border-t border-ink-border pt-2 text-xs">
          {onTogglePublic && (
            <button onClick={() => onTogglePublic(task)} className="text-mute hover:text-paper">
              {task.is_public ? 'Make private' : 'Make public'}
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
