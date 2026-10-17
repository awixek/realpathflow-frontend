import { useState } from 'react'
import { formatHoursMinutes } from '../lib/time'
import { getTaskProgress, TaskProgress } from '../lib/taskProgressApi'
import { friendlyError } from '../lib/errorMessages'

function readableDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  })
}

export default function TaskProgressPanel({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<TaskProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    if (!open && !data && !loading) {
      setLoading(true)
      setError('')
      try {
        setData(await getTaskProgress(taskId))
      } catch (err) {
        setError(friendlyError(err, 'Couldn’t load this task’s progress.'))
      } finally {
        setLoading(false)
      }
    }
    setOpen((value) => !value)
  }

  return (
    <div className="border-t border-ink-border pt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-1 text-left text-sm text-mute hover:text-flow"
      >
        <span>Task history &amp; total progress</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {loading && <p className="text-sm text-mute">Loading task history…</p>}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {data && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Scheduled days" value={String(data.scheduled_days_elapsed)} />
                <Metric label="Days worked" value={String(data.days_with_activity)} />
                <Metric label="Targets met" value={`${data.days_target_met}/${data.scheduled_days_elapsed}`} />
                <Metric label="Overall progress" value={`${data.progress_percent}%`} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-mute">
                  <span>{formatHoursMinutes(data.total_logged_seconds)} logged</span>
                  <span>{formatHoursMinutes(data.total_required_seconds)} target so far</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-panel" role="progressbar" aria-label="Cumulative task progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.progress_percent}>
                  <div className="h-full rounded-full bg-flow" style={{ width: `${data.progress_percent}%` }} />
                </div>
              </div>
              {data.timeline_limited && (
                <p className="text-[11px] text-mute">Showing the most recent 366 days. Overall totals include the full task history.</p>
              )}
              {data.days.length === 0 ? (
                <p className="rounded-md border border-dashed border-ink-border p-3 text-xs text-mute">No daily activity or notes recorded yet.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-md border border-ink-border">
                  <div className="grid grid-cols-[minmax(94px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)] gap-2 bg-ink-panel px-3 py-2 text-[11px] text-mute">
                    <span>Date</span><span>Time</span><span>Daily target</span>
                  </div>
                  <div className="divide-y divide-ink-border">
                    {[...data.days].reverse().map((day) => (
                      <div key={day.date} className="px-3 py-2.5">
                        <div className="grid grid-cols-[minmax(94px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)] items-center gap-2 text-xs">
                          <span className="text-paper">{readableDate(day.date)}</span>
                          <span className="font-mono text-paper">
                            {formatHoursMinutes(day.logged_seconds)}
                            {day.has_target && (
                              <span className={`ml-1 font-sans text-[10px] ${day.is_complete ? 'text-flow' : 'text-mute'}`}>
                                {Math.min(100, Math.floor(day.logged_seconds / Math.max(1, day.required_seconds) * 100))}%
                              </span>
                            )}
                          </span>
                          <span className={day.is_complete ? 'text-flow' : 'text-mute'}>
                            {day.has_target ? `${formatHoursMinutes(day.required_seconds)}${day.is_complete ? ' ✓' : ''}` : 'No target'}
                          </span>
                        </div>
                        {day.note && <p className="mt-2 whitespace-pre-wrap break-words rounded bg-ink-panel/70 px-2.5 py-2 text-xs text-mute">📝 {day.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-border bg-ink-panel/40 p-2.5">
      <p className="text-[10px] text-mute">{label}</p>
      <p className="mt-1 font-display text-base text-paper">{value}</p>
    </div>
  )
}
