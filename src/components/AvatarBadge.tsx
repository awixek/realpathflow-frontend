/**
 * Shows the user's uploaded photo if they have one, otherwise their
 * initial in a circle. This is intentionally the single place avatar
 * rendering lives - every caller just passes label + avatarUrl and gets
 * the right thing automatically.
 */
function initialFor(label: string | null | undefined): string {
  if (!label) return '?'
  return label.trim().charAt(0).toUpperCase()
}

export default function AvatarBadge({
  label,
  avatarUrl,
  size = 'md'
}: {
  label: string | null | undefined
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const dimensions = size === 'lg' ? 'h-14 w-14 text-xl' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`shrink-0 rounded-full border border-ink-border object-cover ${dimensions}`}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-ink-border bg-ink-panel font-display text-paper ${dimensions}`}
    >
      {initialFor(label)}
    </div>
  )
}
