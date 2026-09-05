import { FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import LiquidVessel from '../components/LiquidVessel'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'check-email'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    if (mode === 'signup') {
      setStatus('check-email')
      return
    }

    // Successful sign-in: the app shell listens for the auth state change
    // and will route to the dashboard on its own.
    setStatus('idle')
  }

  async function handleGoogleAuth() {
    setStatus('loading')
    setErrorMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
    }
    // On success, Supabase redirects the browser to Google, so nothing
    // else runs here - the user lands back on redirectTo once done.
  }

  return (
    <div className="flex min-h-screen flex-col-reverse lg:flex-row">
      {/* Hero / vessel side */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 border-t border-ink-border px-8 py-16 lg:border-r lg:border-t-0">
        <LiquidVessel />
        <p className="max-w-xs text-center font-display text-lg leading-snug text-paper/90">
          Progress you can point to — every hour tracked is one you actually spent.
        </p>
      </div>

      {/* Form side */}
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl text-paper">RealPathFlow</h1>
          <p className="mt-2 text-sm text-mute">
            {mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Create an account to start your roadmap.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-paper/80">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-ink-border bg-ink-panel px-3 py-2.5 text-paper outline-none focus:border-flow"
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-paper/80">Password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-ink-border bg-ink-panel px-3 py-2.5 text-paper outline-none focus:border-flow"
                placeholder="••••••••"
              />
            </label>

            {status === 'error' && (
              <p role="alert" className="text-sm text-red-400">
                {errorMessage}
              </p>
            )}

            {status === 'check-email' && (
              <p role="status" className="text-sm text-flow">
                Check your inbox to confirm your email, then sign in.
              </p>
            )}

            <motion.button
              type="submit"
              disabled={status === 'loading'}
              whileTap={{ scale: 0.98 }}
              className="mt-2 rounded-md bg-flow py-2.5 font-medium text-ink transition-colors hover:bg-flow/90 disabled:opacity-60"
            >
              {status === 'loading' ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </motion.button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-border" />
            <span className="text-xs text-mute">or</span>
            <div className="h-px flex-1 bg-ink-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={status === 'loading'}
            className="flex w-full items-center justify-center gap-2.5 rounded-md border border-ink-border bg-ink-panel py-2.5 text-sm font-medium text-paper transition-colors hover:border-mute disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setStatus('idle')
              setErrorMessage('')
            }}
            className="mt-6 text-sm text-mute hover:text-paper"
          >
            {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
