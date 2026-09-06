import { motion } from 'framer-motion'
import { useState } from 'react'
import { deleteRoadmap } from '../lib/roadmapApi'
import { supabase } from '../lib/supabase'

type Step = 'confirm' | 'otp'

export default function DeleteRoadmapModal({
  roadmapId,
  roadmapTitle,
  email,
  onClose,
  onDeleted
}: {
  roadmapId: string
  roadmapTitle: string
  email: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [step, setStep] = useState<Step>('confirm')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode() {
    setBusy(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      })
      if (otpError) throw otpError
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelete() {
    setBusy(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      if (verifyError) throw verifyError
      await deleteRoadmap(roadmapId)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect or expired code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-lg border border-ink-border bg-ink-panel p-6"
      >
        {step === 'confirm' && (
          <>
            <h2 className="font-display text-lg text-paper">Delete "{roadmapTitle}"?</h2>
            <p className="mt-2 text-sm text-mute">
              This can't be undone. We'll email a confirmation code to {email} first.
            </p>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className="text-sm text-mute hover:text-paper">
                Cancel
              </button>
              <button
                onClick={handleSendCode}
                disabled={busy}
                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500/90 disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2 className="font-display text-lg text-paper">Enter the code</h2>
            <p className="mt-2 text-sm text-mute">Check {email} for a 6-digit code.</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
              autoFocus
              className="mt-4 w-full rounded-md border border-ink-border bg-ink px-3 py-2.5 text-center text-lg tracking-[0.5em] text-paper outline-none focus:border-flow"
              placeholder="------"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={onClose} className="text-sm text-mute hover:text-paper">
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={busy || code.length < 6}
                className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500/90 disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
