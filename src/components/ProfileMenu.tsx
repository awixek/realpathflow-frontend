import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'

function initialFor(email: string | undefined): string {
  if (!email) return '?'
  return email.trim().charAt(0).toUpperCase()
}

export default function ProfileMenu() {
  const { session } = useAuth()
  const email = session?.user?.email

  const [open, setOpen] = useState(false)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function close() {
    setOpen(false)
    setConfirmingSignOut(false)
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close()
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    if (open) {
      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('keydown', onKeyDown)
    }
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleSignOutClick() {
    if (!confirmingSignOut) {
      setConfirmingSignOut(true)
      return
    }
    supabase.auth.signOut()
  }

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-full border font-display text-sm text-paper transition-colors ${
          open ? 'border-flow bg-flow/10' : 'border-ink-border hover:border-flow/60'
        }`}
      >
        {initialFor(email)}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-lg border border-ink-border bg-ink-panel shadow-xl"
          >
            {email && (
              <div className="border-b border-ink-border px-4 py-3">
                <p className="truncate text-sm text-paper">{email}</p>
              </div>
            )}

            {/* Future account-level features (settings, notifications, etc.)
                get added here as additional rows in this same panel. */}

            <div className="p-1.5">
              <button
                onClick={handleSignOutClick}
                onMouseLeave={() => setConfirmingSignOut(false)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  confirmingSignOut
                    ? 'bg-red-500/10 text-red-400'
                    : 'text-paper/80 hover:bg-ink hover:text-paper'
                }`}
              >
                {confirmingSignOut ? 'Tap again to sign out' : 'Sign out'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
