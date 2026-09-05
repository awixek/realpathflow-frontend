import { motion } from 'framer-motion'

export default function DayProgressBox({ percent }: { percent: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-16 w-16 overflow-hidden rounded-md border-2 border-black bg-ink-panel">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${percent}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-0 left-0 right-0 bg-flow"
        />
        <span className="relative z-10 flex h-full w-full items-center justify-center font-display text-sm text-paper mix-blend-difference">
          {percent}%
        </span>
      </div>
      <span className="text-[11px] text-mute">today</span>
    </div>
  )
}
