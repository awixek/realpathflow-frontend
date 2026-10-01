import { useEffect, useMemo, useRef, useState } from 'react'
import { todayIso } from '../lib/time'

type Props = {
  value: string
  onChange: (value: string) => void
  label: string
  min?: string
  max?: string
  id?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : new Date()
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthStart(value: string) {
  const date = parseDate(value)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export default function DatePicker({ value, onChange, label, min, max, id }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => monthStart(value || min || todayIso()))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (value) setView(monthStart(value))
  }, [value])

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const start = new Date(view.getFullYear(), view.getMonth(), 1 - first.getDay())
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [view])

  const selected = value ? parseDate(value) : null
  const minDate = min ? parseDate(min) : null
  const maxDate = max ? parseDate(max) : null
  const today = parseDate(todayIso())

  function choose(date: Date) {
    const iso = toIso(date)
    if (min && iso < min) return
    if (max && iso > max) return
    onChange(iso)
    setOpen(false)
  }

  function shiftMonth(delta: number) {
    setView((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <span className="text-sm text-paper/80">{label}</span>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-[44px] items-center justify-between rounded-md border border-ink-border bg-ink px-3 py-2.5 text-left text-paper outline-none transition-colors hover:border-flow focus:border-flow"
      >
        <span className={value ? 'text-paper' : 'text-mute'}>
          {value
            ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parseDate(value))
            : 'Select date'}
        </span>
        <span aria-hidden className="text-mute">▣</span>
      </button>

      {open && (
        <div role="dialog" aria-label={`${label} calendar`} className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-ink-border bg-ink-panel p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className="h-9 w-9 rounded-md border border-ink-border text-paper hover:border-flow" aria-label="Previous month">‹</button>
            <div className="text-sm font-medium text-paper">{MONTHS[view.getMonth()]} {view.getFullYear()}</div>
            <button type="button" onClick={() => shiftMonth(1)} className="h-9 w-9 rounded-md border border-ink-border text-paper hover:border-flow" aria-label="Next month">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-mute">
            {WEEKDAYS.map((day) => <span key={day} className="py-1">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const iso = toIso(date)
              const inMonth = date.getMonth() === view.getMonth()
              const disabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate))
              const isSelected = selected ? toIso(selected) === iso : false
              const isToday = toIso(today) === iso
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => choose(date)}
                  className={`h-9 rounded-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-flow font-medium text-ink'
                      : isToday
                        ? 'border border-flow/70 text-flow'
                        : inMonth
                          ? 'text-paper hover:bg-flow/10 hover:text-flow'
                          : 'text-mute/40'
                  } disabled:cursor-not-allowed disabled:opacity-20`}
                  aria-label={new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(date)}
                  aria-current={isToday ? 'date' : undefined}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => choose(parseDate(todayIso()))}
            disabled={Boolean((minDate && today < minDate) || (maxDate && today > maxDate))}
            className="mt-3 w-full rounded-md border border-ink-border py-2 text-xs text-paper hover:border-flow hover:text-flow disabled:opacity-40"
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}
