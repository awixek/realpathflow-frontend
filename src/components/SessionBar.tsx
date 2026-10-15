import { motion } from 'framer-motion'
import { Task, TaskSession } from '../types'
import { formatHoursMinutes } from '../lib/time'

export default function SessionBar({
  session,
  task,
  loggedSecondsToday,
  dailySnapshotAt,
  onPause,
  onResume,
  busy
}: {
  session: TaskSession
  task: Task | undefined
  loggedSecondsToday: number
  dailySnapshotAt: number
  onPause: () => void
  onResume: () => void
  busy: boolean
}) {
  const isPaused = session.status === 'PAUSED'
  const targetSeconds = (task?.daily_minutes ?? 0) * 60
  const secondsToday = Math.max(
    0,
    loggedSecondsToday + (session.status === 'ACTIVE' ? Math.floor(Math.max(0, Date.now() - dailySnapshotAt) / 1000) : 0)
  )
  const progressPercent = targetSeconds > 0
    ? Math.min(100, Math.floor((secondsToday / targetSeconds) * 100))
    : 0

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-ink-border bg-ink-panel/95 px-6 py-3 backdrop-blur"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${isPaused ? 'bg-mute' : 'animate-pulse bg-flow'}`}
            aria-hidden="true"
          />
          <span className="truncate font-display text-paper">{task?.name ?? 'Task'}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
          <span>Today: <span className="font-mono text-paper">{formatHoursMinutes(secondsToday)}</span>
            {targetSeconds > 0 ? ` / ${formatHoursMinutes(targetSeconds)}` : ''}</span>
          <span className="font-semibold text-flow">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-1 w-full max-w-sm overflow-hidden rounded-full bg-ink">
          <div className="h-full rounded-full bg-flow transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <button
        disabled={busy}
        onClick={isPaused ? onResume : onPause}
        className="shrink-0 rounded-md border border-flow px-3 py-1.5 text-sm text-flow hover:bg-flow hover:text-ink disabled:opacity-50"
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
    </motion.div>
  )
}
