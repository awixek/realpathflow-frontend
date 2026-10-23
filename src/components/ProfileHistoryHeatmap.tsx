import { useEffect, useMemo, useRef, useState } from 'react'
import InlineNotice from './InlineNotice'
import { getProfileHistory } from '../lib/profileApi'
import { formatHoursMinutes } from '../lib/time'
import { friendlyError } from '../lib/errorMessages'
import { getProfileDayDetails, ProfileDayDetails } from '../lib/taskProgressApi'
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

function readableDate(iso: string): string {
  return utcDate(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  })
}

export default function ProfileHistoryHeatmap() {
  const [history, setHistory] = useState<ProfileHistory | null>(null)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetails, setDayDetails] = useState<ProfileDayDetails | null>(null)
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState('')
  const requestId = useRef(0)

  useEffect(() => {
    getProfileHistory()
      .then(setHistory)
      .catch((err) => setError(friendlyError(err, 'Couldn’t load your activity history. Please try again.')))
  }, [])

  const weeks = useMemo(() => history ? buildWeeks(history) : [], [history])

  async function openDay(day: HistoryDay) {
    if (!day.is_active && day.logged_seconds <= 0) return
    const id = ++requestId.current
    setSelectedDate(day.date)
    setDayDetails(null)
    setDayLoading(true)
    setDayError('')
    try {
      const result = await getProfileDayDetails(day.date)
      if (id === requestId.current) setDayDetails(result)
    } catch (err) {
      if (id === requestId.current) setDayError(friendlyError(err, 'Couldn’t load that day’s details.'))
    } finally {
      if (id === requestId.current) setDayLoading(false)
    }
  }

  function closeDay() {
    requestId.current += 1
    setSelectedDate(null)
    setDayDetails(null)
    setDayError('')
    setDayLoading(false)
  }

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
    <>
      <section className="rounded-lg border border-ink-border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-paper">Activity history</p>
            <p className="mt-1 text-sm text-mute">Tap any active day to view the tasks, time and notes saved for that date.</p>
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
                    ? `${day.date}: ${formatHoursMinutes(day.logged_seconds)} of ${formatHoursMinutes(day.required_seconds)}${day.is_complete ? ' — complete' : ''}. View day details.`
                    : `${day.date}: no scheduled work`
                  const clickable = day.is_active || day.logged_seconds > 0
                  return (
                    <button
                      key={day.date}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-haspopup={clickable ? 'dialog' : undefined}
                      disabled={!clickable}
                      onClick={() => { void openDay(day) }}
                      className={`h-3.5 w-3.5 rounded-[3px] ${level(day)} ${clickable ? 'cursor-pointer outline-offset-2 hover:ring-2 hover:ring-flow focus-visible:ring-2 focus-visible:ring-flow' : 'cursor-default'}`}
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

      {selectedDate && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeDay() }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-day-title"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl border border-ink-border bg-ink sm:rounded-xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-ink-border p-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-flow">Daily record</p>
                <h2 id="history-day-title" className="mt-1 font-display text-xl text-paper">{readableDate(selectedDate)}</h2>
                {dayDetails && <p className="mt-1 text-sm text-mute">{formatHoursMinutes(dayDetails.logged_seconds)} logged · {formatHoursMinutes(dayDetails.required_seconds)} target</p>}
              </div>
              <button type="button" onClick={closeDay} className="rounded-md border border-ink-border px-3 py-1.5 text-sm text-paper hover:border-flow">Close</button>
            </header>
            <div className="overflow-y-auto p-5">
              {dayLoading && <p className="py-8 text-center text-sm text-mute">Loading this day’s tasks and notes…</p>}
              {dayError && <div className="py-6"><InlineNotice>{dayError}</InlineNotice></div>}
              {dayDetails && dayDetails.tasks.length === 0 && (
                <p className="rounded-lg border border-dashed border-ink-border p-6 text-center text-sm text-mute">No tasks or notes were recorded for this date.</p>
              )}
              {dayDetails && dayDetails.tasks.length > 0 && (
                <div className="flex flex-col gap-3">
                  {dayDetails.tasks.map((task) => (
                    <article key={task.task_id} className="rounded-lg border border-ink-border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-display text-base text-paper">{task.name}</h3>
                          {task.subject && <p className="mt-0.5 text-xs text-mute">{task.subject}</p>}
                        </div>
                        <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] ${task.is_complete ? 'border-flow/40 text-flow' : 'border-ink-border text-mute'}`}>
                          {task.is_complete ? 'Daily target complete ✓' : task.has_target ? 'Target incomplete' : 'No target scheduled'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mute">
                        <span>Time: <strong className="font-mono font-normal text-paper">{formatHoursMinutes(task.logged_seconds)}</strong></span>
                        {task.has_target && <span>Target: <strong className="font-mono font-normal text-paper">{formatHoursMinutes(task.required_seconds)}</strong></span>}
                        {task.has_target && <span className="text-flow">{task.required_seconds > 0 ? Math.min(100, Math.floor(task.logged_seconds / task.required_seconds * 100)) : 0}%</span>}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-panel">
                        <div className="h-full rounded-full bg-flow" style={{ width: `${task.required_seconds > 0 ? Math.min(100, Math.floor(task.logged_seconds / task.required_seconds * 100)) : 0}%` }} />
                      </div>
                      <div className="mt-4 rounded-md bg-ink-panel/60 p-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mute">Daily note</p>
                        {task.note ? (
                          <p className="whitespace-pre-wrap break-words text-sm text-paper">{task.note}</p>
                        ) : (
                          <p className="text-sm italic text-mute">No note added for this day.</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
