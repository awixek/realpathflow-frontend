import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { useCurrentUserProfile } from '../lib/profileApi'
import AvatarBadge from './AvatarBadge'
import { supabase } from '../lib/supabase'

interface NavDrawerProps {
  open: boolean
  onClose: () => void
}

function MenuLink({
  to,
  children,
  onNavigate
}: {
  to: string
  children: string
  onNavigate: () => void
}) {
  const location = useLocation()
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={`rounded-md px-3 py-2.5 text-sm transition-colors ${
        isActive ? 'bg-flow/10 text-flow' : 'text-paper/80 hover:bg-ink hover:text-paper'
      }`}
    >
      {children}
    </NavLink>
  )
}

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const me = useCurrentUserProfile()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  const displayName = me?.profile?.username ?? me?.email ?? null

  useEffect(() => {
    if (!open) setConfirmingSignOut(false)
  }, [open])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function handleSignOutClick() {
    if (!confirmingSignOut) {
      setConfirmingSignOut(true)
      return
    }
    supabase.auth.signOut()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-border bg-ink-panel p-4"
          >
            <NavLink
              to="/profile"
              onClick={onClose}
              className="mb-4 flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-ink"
            >
              <AvatarBadge label={displayName} avatarUrl={me?.profile?.avatar_url} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-display text-paper">{displayName ?? 'Your profile'}</p>
                <p className="text-xs text-mute">View profile</p>
              </div>
            </NavLink>

            <nav className="flex flex-1 flex-col gap-1">
              <MenuLink to="/" onNavigate={onClose}>
                Today
              </MenuLink>
              <MenuLink to="/profile" onNavigate={onClose}>
                Profile
              </MenuLink>
              <MenuLink to="/search" onNavigate={onClose}>
                Search
              </MenuLink>
            </nav>

            <button
              onClick={handleSignOutClick}
              onMouseLeave={() => setConfirmingSignOut(false)}
              className={`mt-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                confirmingSignOut ? 'bg-red-500/10 text-red-400' : 'text-paper/80 hover:bg-ink hover:text-paper'
              }`}
            >
              {confirmingSignOut ? 'Tap again to sign out' : 'Sign out'}
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
