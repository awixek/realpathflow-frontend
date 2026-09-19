import { motion } from 'framer-motion'

/**
 * A glass vessel that fills with amber liquid on mount, then settles into
 * a slow, subtle wave. Represents "real, verified progress" - the core
 * metaphor of the product - rather than a decorative loading spinner.
 */
export default function LiquidVessel() {
  const fillLevel = 63 // static for the auth screen; becomes real data on the dashboard

  return (
    <div className="relative flex h-72 w-40 items-end justify-center sm:h-96 sm:w-52">
      {/* glass outline */}
      <div className="absolute inset-0 rounded-t-[3rem] rounded-b-lg border border-ink-border" />

      {/* liquid fill */}
      <motion.div
        initial={{ height: '0%' }}
        animate={{ height: `${fillLevel}%` }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-b-lg"
        style={{ margin: '1px' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-flow to-flow-dim" />

        {/* surface ripple */}
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[-10%] right-[-10%] top-0 h-3 bg-flow/80 blur-[2px]"
        />
      </motion.div>

      {/* level marker */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="absolute -right-2 bottom-[calc(63%+0.5rem)] translate-x-full font-display text-sm text-mute"
      >
        {fillLevel}%
      </motion.span>
    </div>
  )
}
