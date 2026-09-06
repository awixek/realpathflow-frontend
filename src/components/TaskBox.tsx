import { motion } from 'framer-motion'
import { useState } from 'react'
import { requestNotificationPermission } from '../lib/notifications'
import { MainTask } from '../types'

function taskProgress(task: MainTask): number {
  const totalMinutes = task.subtasks.reduce((sum, s) => sum + s.estimatedMinutes, 0)
  const doneMinutes = task.subtasks
    .filter((s) => s.status === 'done')
    .reduce((sum, s) => sum + s.estimatedMinutes, 0)
  return totalMinutes === 0 ? 0 : Math.round((doneMinutes / totalMinutes) * 100)
}

export default function TaskBox({
  task,
  isActive,
  onStart
}: {
  task: MainTask
  isActive: boolean
  onStart: (taskId: string) => void
}) {
  const progress = taskProgress(task)
  const isDone = task.status === 'done'
  const isLocked = task.status === 'not_started'
  const [confirming, setConfirming] = useState(false)

  function handleStartClick() {
    // Fire on the click itself (a real user gesture) - browsers ignore
    // permission prompts triggered from a deferred setTimeout callback.
    requestNotificationPermission()
    setConfirming(true)
    // Brief "Ready to start" confirmation before the top control bar takes over.
    setTimeout(() => {
      setConfirming(false)
      onStart(task.id)
    }, 700)
  }

  return (
    <motion.div
      layout
      whileHover={!isLocked ? { y: -2, borderColor: '#3ECF7E' } : undefined}
      transition={{ layout: { duration: 0.3 } }}
      className={`relative flex flex-col gap-3 overflow-hidden rounded-lg border p-4 transition-shadow ${
        isActive ? 'border-flow shadow-[0_0_0_1px_rgba(62,207,126,0.3)]' : 'border-black'
      } ${isLocked ? 'opacity-50' : ''}`}
    >
      {/* full-box fill once done */}
      {isDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          className="pointer-events-none absolute inset-0 bg-flow"
        />
      )}

      <div className="relative flex items-center justify-between">
        <h3 className="font-display text-lg text-paper">{task.title}</h3>
        {isDone && <span className="text-xs text-flow">Complete</span>}
      </div>

      <ul className="relative flex flex-col gap-1.5">
        {task.subtasks.map((sub) => (
          <li key={sub.id} className="flex items-center gap-2 text-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                sub.status === 'done'
                  ? 'bg-flow'
                  : sub.status === 'active'
                    ? 'animate-pulse bg-flow/70'
                    : 'bg-ink-border'
              }`}
            />
            <span className={sub.status === 'done' ? 'text-mute line-through' : 'text-paper/90'}>
              {sub.title}
            </span>
          </li>
        ))}
      </ul>

      {/* single progress line for the whole task */}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-ink-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-flow"
        />
      </div>

      {task.status === 'ready' &&
        (confirming ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative text-sm text-flow">
            Ready to start…
          </motion.p>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleStartClick}
            className="relative self-start rounded-md border border-flow px-3 py-1.5 text-sm text-flow transition-colors hover:bg-flow hover:text-ink"
          >
            Start
          </motion.button>
        ))}

      {isLocked && <p className="relative text-xs text-mute">Finish the previous task to unlock this one.</p>}
    </motion.div>
  )
}
