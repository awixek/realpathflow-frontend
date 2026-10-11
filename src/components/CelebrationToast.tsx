import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useActiveSession } from '../lib/ActiveSessionContext'

const AUTO_DISMISS_MS = 4000

export default function CelebrationToast() {
  const { celebration, dismissCelebration } = useActiveSession()

  useEffect(() => {
    if (!celebration) return
    const timer = window.setTimeout(dismissCelebration, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [celebration, dismissCelebration])

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissCelebration}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="mx-4 flex flex-col items-center gap-3 rounded-lg border border-flow/40 bg-ink-panel px-8 py-10 text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-flow/15 text-flow"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.25, duration: 0.35 }}
                />
              </svg>
            </motion.div>
            <p className="font-display text-xl text-paper">Target complete</p>
            <p className="text-sm text-mute">
              “{celebration.taskName}” hit today's target — timer stopped automatically.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
