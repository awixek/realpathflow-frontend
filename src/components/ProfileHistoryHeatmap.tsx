import { useEffect, useMemo, useState } from 'react'
import { getProfileHistory } from '../lib/profileApi'
import { formatHoursMinutes } from '../lib/time'
import { friendlyError } from '../lib/errorMessages'
import { HistoryDay, ProfileHistory } from '../types'

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

function isoFromDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function shiftDays(iso: string, amount: number): string {
  const date = utcDate(iso)
  date.setUTCDate(date.getUTCDate() + amount)
  return isoFromDate(date)
}

function level(day: HistoryDay): string {
  if (!day.is_active) return 'bg-ink-border/30'
  if (day.is_complete) return 'bg-flow'
  if (day.logged_seconds <= 0) return 'bg-flow/10'
  const ratio = day.logged_seconds / Math.max(1, day.required_seconds)
  if (ratio >= 0.75) return 'bg-flow/70'
  if (ratio >= 0.5) return 'bg-flow/50'
  return 'bg-flow/30'
}

function buildWeeks(history: ProfileHistory): Array<Array<HistoryDay | null>> {
  const byDate = new Map(history.days.map((day) => [day.date, day]))
  const start = utcDate(history.start_date)
  const end = utcDate(history.end_date)
  const leading = start.getUTCDay()
  const firstCell = shiftDays(history.start_date, -leading)
  const totalCells = Math.ceil((leading + history.days.length) / 7) * 7
  const weeks: Array<Array<HistoryDay | null>> = []

  for (let offset = 0; offset < totalCells; offset += 7) {
    const week: Array<HistoryDay | null> = []
    for (let row = 0; row < 7; row += 1) {
      const iso = shiftDays(firstCell, offset + row)
      const date = utcDate(iso)
      week.push(date < start || date > end ? null : byDate.get(iso) ?? null)
    }
    weeks.push(week)
  }
  return weeks
}

function monthLabel(week: Array<HistoryDay | null>): string {
  const day = week.find((item) => item?.date.endsWith('-01'))
  if (!day) return ''
  return utcDate(day.date).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
}

export default function ProfileHistoryHeatmap() {
  const [history, setHistory] = useState<ProfileHistory | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfileHistory()
      .then(setHistory)
      .catch((err) => setError(friendlyError(err, 'Couldn’t load your activity history. Please try again.')))
  }, [])

  const weeks = useMemo(() => history ? buildWeeks(history) : [], [history])

  if (error) {
    return (
      <section className="rounded-lg border border-ink-border p-6">
        <p className="font-display text-paper">Activity history</p>
        <p role="alert" className="mt-2 text-sm text-mute">{error}</p>
      </section>
    )
  }

  if (!history) {
    return (
      <section aria-busy="true" className="rounded-lg border border-ink-border p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-ink-border/60" />
        <div className="mt-5 h-28 animate-pulse rounded bg-ink-border/30" />
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-ink-border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-paper">Activity history</p>
          <p className="mt-1 text-sm text-mute">Your scheduled days and completed daily targets.</p>
        </div>
        <div className="flex gap-5 text-sm">
          <div>
            <p className="text-mute">Current streak</p>
            <p className="font-display text-xl text-flow">{history.current_streak_days} days</p>
          </div>
          <div>
            <p className="text-mute">Best streak</p>
            <p className="font-display text-xl text-paper">{history.best_streak_days} days</p>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          <div className="mb-2 ml-8 grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))` }}>
            {weeks.map((week, index) => (
              <span key={index} className="h-4 text-[10px] text-mute">{monthLabel(week)}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="grid w-6 grid-rows-7 gap-1 text-[9px] text-mute">
              <span />
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
            </div>
            <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1">
              {weeks.flatMap((week, weekIndex) => week.map((day, row) => {
                if (!day) return <span key={`${weekIndex}-${row}`} className="h-3.5 w-3.5" aria-hidden="true" />
                const ratio = day.required_seconds > 0 ? Math.min(1, day.logged_seconds / day.required_seconds) : 0
                const label = day.is_active
                  ? `${day.date}: ${formatHoursMinutes(day.logged_seconds)} of ${formatHoursMinutes(day.required_seconds)}${day.is_complete ? ' — complete' : ''}`
                  : `${day.date}: no scheduled work`
                return (
                  <span
                    key={day.date}
                    title={label}
                    aria-label={label}
                    className={`h-3.5 w-3.5 rounded-[3px] ${level(day)}`}
                    data-completion={ratio}
                  />
                )
              }))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-mute">
        <span>Less</span>
        <span className="h-3.5 w-3.5 rounded-[3px] bg-flow/10" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-flow/30" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-flow/50" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-flow/70" />
        <span className="h-3.5 w-3.5 rounded-[3px] bg-flow" />
        <span>More</span>
      </div>
    </section>
  )
}
