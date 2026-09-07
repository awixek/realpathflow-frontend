import { motion } from 'framer-motion'
import { MainTask } from '../types'

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600).toString().padStart(2, '0')
  const m = Math.floor((safe % 3600) / 60).toString().padStart(2, '0')
  const s = (safe % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function ActiveTaskBar({
  task,
  isPaused,
  elapsedSeconds,
  targetSeconds,
  livePercent,
  onTogglePause,
  onCompleteSubtask
}: {
  task: MainTask
  isPaused: boolean
  elapsedSeconds: number
  targetSeconds?: number | null
  livePercent: number
  onTogglePause: () => void
  onCompleteSubtask: () => void
}) {
  const currentSubtask = task.subtasks.find((s) => s.status === 'active')

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-ink-border bg-ink-panel/95 px-6 py-3 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <span className="font-display text-paper">{task.title}</span>
        {currentSubtask && <span className="text-sm text-mute">— {currentSubtask.title}</span>}
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-sm text-mute">{targetSeconds != null ? `${formatDuration(Math.max(0, targetSeconds - elapsedSeconds))} remaining` : formatDuration(elapsedSeconds)}</span>
        <span className="text-sm text-flow">{livePercent}%</span>

        <button
          onClick={onTogglePause}
          className="rounded-md border border-ink-border px-3 py-1.5 text-sm text-paper hover:border-flow"
        >
          {isPaused ? 'Start' : 'Pause'}
        </button>

        {currentSubtask && (
          <button
            onClick={onCompleteSubtask}
            className="rounded-md bg-flow px-3 py-1.5 text-sm font-medium text-ink hover:bg-flow/90"
          >
            Complete step
          </button>
        )}
      </div>
    </motion.div>
  )
}
