export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(safe / 3600).toString().padStart(2, '0')
  const m = Math.floor((safe % 3600) / 60).toString().padStart(2, '0')
  const s = (safe % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** e.g. 5400 -> "1h 30m", 3600 -> "1h", 900 -> "15m" */
export function formatHoursMinutes(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h === 0 && m === 0) return '0m'
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function minutesToLabel(minutes: number): string {
  return formatHoursMinutes(minutes * 60)
}

export function todayIso(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayLabel(sundayIndexed: number): string {
  return WEEKDAY_LABELS[sundayIndexed] ?? '?'
}

export const WEEKDAYS = WEEKDAY_LABELS.map((label, index) => ({ index, label }))
