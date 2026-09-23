import { motion } from 'framer-motion'
import { Task, TaskSession } from '../types'
import { formatClock } from '../lib/time'

export default function SessionBar({
  session,
  task,
  liveElapsedSeconds,
  onPause,
  onResume,
  onComplete,
  busy
}: {
  session: TaskSession
  task: Task | undefined
  liveElapsedSeconds: number
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  busy: boolean
}) {
  const isPaused = session.status === 'PAUSED'

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-ink-border bg-ink-panel/95 px-6 py-3 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${isPaused ? 'bg-mute' : 'animate-pulse bg-flow'}`}
          aria-hidden="true"
        />
        <span className="font-display text-paper">{task?.name ?? 'Task'}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-sm text-mute">{formatClock(liveElapsedSeconds)}</span>

        <button
          disabled={busy}
          onClick={isPaused ? onResume : onPause}
          className="rounded-md border border-ink-border px-3 py-1.5 text-sm text-paper hover:border-flow disabled:opacity-50"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>

        <button
          disabled={busy}
          onClick={onComplete}
          className="rounded-md bg-flow px-3 py-1.5 text-sm font-medium text-ink hover:bg-flow/90 disabled:opacity-50"
        >
          Stop
        </button>
      </div>
    </motion.div>
  )
}
