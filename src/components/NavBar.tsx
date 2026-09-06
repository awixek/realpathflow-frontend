import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function NavItem({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  const location = useLocation()
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <NavLink to={to} end={end} className="relative py-1 text-sm">
      <span className={isActive ? 'text-flow' : 'text-mute transition-colors hover:text-paper'}>{children}</span>
      {isActive && (
        <motion.div
          layoutId="nav-underline"
          className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-flow"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
    </NavLink>
  )
}

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between border-b border-ink-border px-6 py-4">
      <div className="flex items-center gap-6">
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display text-lg text-paper"
        >
          RealPathFlow
        </motion.span>
        <NavItem to="/" end>
          Roadmap
        </NavItem>
        <NavItem to="/profile">Profile</NavItem>
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        className="text-sm text-mute transition-colors hover:text-paper"
      >
        Sign out
      </button>
    </nav>
  )
}
