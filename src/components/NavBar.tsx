import { useState } from 'react'
import { motion } from 'framer-motion'
import NavDrawer from './NavDrawer'

export default function NavBar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <nav className="flex items-center gap-4 border-b border-ink-border px-4 py-4 sm:px-6">
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-paper/80 transition-colors hover:bg-ink-panel hover:text-paper"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <motion.span
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="font-display text-lg text-paper"
      >
        RealPathFlow
      </motion.span>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </nav>
  )
}
