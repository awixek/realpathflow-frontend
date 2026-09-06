import { motion } from 'framer-motion'

export default function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-black">
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-flow"
          initial={{ height: '10%' }}
          animate={{ height: ['10%', '90%', '10%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <p className="text-sm text-mute">{label}</p>
    </div>
  )
}
