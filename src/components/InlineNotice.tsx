import { ReactNode } from 'react'

/**
 * Calm, low-alarm message for non-critical problems (a note that didn't
 * load, a history panel that's slow). Reserve red text for things the person
 * must fix themselves (invalid form, expired sign-in).
 */
export default function InlineNotice({ children, onRetry, retryLabel = 'Retry' }: {
  children: ReactNode
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-2 text-xs text-mute">
      <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
      <span>{children}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-flow underline-offset-2 hover:underline">
          {retryLabel}
        </button>
      )}
    </p>
  )
}
