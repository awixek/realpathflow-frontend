import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useInstallPrompt } from '../lib/useInstallPrompt'

const DISMISS_KEY = 'realpathflow:install-prompt-dismissed-until'
const SNOOZE_DAYS = 7

function isDismissed(): boolean {
  const until = localStorage.getItem(DISMISS_KEY)
  return until !== null && Date.now() < Number(until)
}

function dismissForNow() {
  const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000
  localStorage.setItem(DISMISS_KEY, String(until))
}

export default function InstallPrompt() {
  const { installed, canPromptInstall, isIOS, promptInstall } = useInstallPrompt()
  const [visible, setVisible] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)

  useEffect(() => {
    if (installed || isDismissed()) {
      setVisible(false)
      return
    }
    // iOS never fires beforeinstallprompt, so offer the instructional
    // version as soon as we know we're on iOS Safari; everywhere else,
    // wait for the browser to confirm it's actually installable.
    setVisible(canPromptInstall || isIOS)
  }, [installed, canPromptInstall, isIOS])

  if (!visible) return null

  function handleDismiss() {
    dismissForNow()
    setVisible(false)
  }

  async function handleInstallClick() {
    if (isIOS) {
      setShowIOSSteps(true)
      return
    }
    const outcome = await promptInstall()
    if (outcome !== 'unavailable') setVisible(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
      >
        <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-ink-border bg-ink-panel p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-md" />
            <div className="flex-1">
              <p className="font-display text-sm text-paper">Install RealPathFlow</p>
              <p className="text-xs text-mute">
                Add it to your home screen for a faster launch and reliable timer notifications.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0 text-mute hover:text-paper"
            >
              ✕
            </button>
          </div>

          {showIOSSteps ? (
            <p className="rounded-md bg-ink px-3 py-2 text-xs text-paper/80">
              Tap the <span className="text-flow">Share</span> icon in Safari's toolbar, then
              choose <span className="text-flow">Add to Home Screen</span>.
            </p>
          ) : (
            <button
              onClick={handleInstallClick}
              className="rounded-md bg-flow py-2 text-sm font-medium text-ink hover:bg-flow/90"
            >
              Install
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
