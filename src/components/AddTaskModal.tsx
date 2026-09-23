import { FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { TaskDraft } from '../lib/tasksApi'
import { WEEKDAYS } from '../lib/time'
import { DEFAULT_FREQUENCY, FrequencyType, TaskFrequency } from '../types'

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export default function AddTaskModal({
  onClose,
  onCreate
}: {
  onClose: () => void
  onCreate: (draft: TaskDraft) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hours, setHours] = useState(1)
  const [minutes, setMinutes] = useState(0)
  const [isPublic, setIsPublic] = useState(false)

  const [frequencyOpen, setFrequencyOpen] = useState(false)
  const [frequency, setFrequency] = useState<TaskFrequency>(DEFAULT_FREQUENCY)
  const [manualDateInput, setManualDateInput] = useState('')

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function setFrequencyType(type: FrequencyType) {
    setFrequency((prev) => ({ ...DEFAULT_FREQUENCY, frequency_type: type, manual_active_dates: prev.manual_active_dates }))
  }

  function toggleWeekday(day: number) {
    setFrequency((prev) => ({
      ...prev,
      excluded_weekdays: prev.excluded_weekdays.includes(day)
        ? prev.excluded_weekdays.filter((d) => d !== day)
        : [...prev.excluded_weekdays, day]
    }))
  }

  function toggleMonthDay(day: number) {
    setFrequency((prev) => ({
      ...prev,
      excluded_month_days: prev.excluded_month_days.includes(day)
        ? prev.excluded_month_days.filter((d) => d !== day)
        : [...prev.excluded_month_days, day]
    }))
  }

  function addManualDate() {
    if (!manualDateInput) return
    setFrequency((prev) =>
      prev.manual_active_dates.includes(manualDateInput)
        ? prev
        : { ...prev, manual_active_dates: [...prev.manual_active_dates, manualDateInput].sort() }
    )
    setManualDateInput('')
  }

  function removeManualDate(date: string) {
    setFrequency((prev) => ({
      ...prev,
      manual_active_dates: prev.manual_active_dates.filter((d) => d !== date)
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!name.trim()) return setError('Give the task a name.')
    if (!startDate || !endDate) return setError('Pick a start and end date.')
    if (endDate < startDate) return setError('End date must be on or after the start date.')
    const dailyMinutes = hours * 60 + minutes
    if (dailyMinutes <= 0) return setError('Daily time must be more than 0.')
    if (frequency.frequency_type === 'MANUAL' && frequency.manual_active_dates.length === 0) {
      return setError('Pick at least one active date for manual frequency, or switch it off.')
    }

    setSaving(true)
    try {
      await onCreate({
        name: name.trim(),
        subject: subject.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        daily_minutes: dailyMinutes,
        is_public: isPublic,
        frequency: frequencyOpen ? frequency : DEFAULT_FREQUENCY
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the task.')
      setSaving(false)
      return
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/80 px-4 py-8 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-ink-border bg-ink-panel p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl text-paper">Add task</h2>
          <button onClick={onClose} className="text-mute hover:text-paper" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-paper/80">Task name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="IIT Madras qualification exam preparation"
              className="rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-paper/80">Subject (optional)</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mathematics"
              className="rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-paper/80">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-paper/80">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-paper/80">Daily time</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-20 rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
              />
              <span className="text-sm text-mute">hr</span>
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-20 rounded-md border border-ink-border bg-ink px-3 py-2.5 text-paper outline-none focus:border-flow"
              />
              <span className="text-sm text-mute">min / day</span>
            </div>
          </div>

          {/* Frequency (optional) */}
          <div className="rounded-md border border-ink-border">
            <button
              type="button"
              onClick={() => setFrequencyOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-paper/80"
            >
              <span>Frequency (optional)</span>
              <span className="text-mute">{frequencyOpen ? '−' : '+'}</span>
            </button>

            {frequencyOpen && (
              <div className="flex flex-col gap-3 border-t border-ink-border p-3">
                <div className="flex flex-wrap gap-2">
                  {(['NONE', 'WEEKLY', 'MONTHLY', 'MANUAL'] as FrequencyType[]).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setFrequencyType(type)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        frequency.frequency_type === type
                          ? 'border-flow bg-flow/10 text-flow'
                          : 'border-ink-border text-mute hover:text-paper'
                      }`}
                    >
                      {type === 'NONE' ? 'Every day' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {frequency.frequency_type === 'WEEKLY' && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-mute">Tap a day to skip it every week.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map(({ index, label }) => {
                        const excluded = frequency.excluded_weekdays.includes(index)
                        return (
                          <button
                            type="button"
                            key={index}
                            onClick={() => toggleWeekday(index)}
                            className={`relative h-9 w-11 rounded-md border text-xs ${
                              excluded
                                ? 'border-red-500/50 text-red-400'
                                : 'border-ink-border text-paper hover:border-flow'
                            }`}
                          >
                            {label}
                            {excluded && (
                              <span className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-red-500" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {frequency.frequency_type === 'MONTHLY' && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-mute">Tap a date-of-month to skip it every month.</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {MONTH_DAYS.map((day) => {
                        const excluded = frequency.excluded_month_days.includes(day)
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => toggleMonthDay(day)}
                            className={`relative h-8 rounded-md border text-xs ${
                              excluded
                                ? 'border-red-500/50 text-red-400'
                                : 'border-ink-border text-paper hover:border-flow'
                            }`}
                          >
                            {day}
                            {excluded && (
                              <span className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-red-500" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {frequency.frequency_type === 'MANUAL' && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-mute">Only the dates you pick here will be active.</p>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={manualDateInput}
                        onChange={(e) => setManualDateInput(e.target.value)}
                        className="flex-1 rounded-md border border-ink-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-flow"
                      />
                      <button
                        type="button"
                        onClick={addManualDate}
                        className="rounded-md border border-flow px-3 text-sm text-flow hover:bg-flow hover:text-ink"
                      >
                        Add
                      </button>
                    </div>
                    {frequency.manual_active_dates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {frequency.manual_active_dates.map((date) => (
                          <span
                            key={date}
                            className="flex items-center gap-1.5 rounded-full border border-flow/40 bg-flow/10 px-2.5 py-1 text-xs text-flow"
                          >
                            {date}
                            <button type="button" onClick={() => removeManualDate(date)} aria-label={`Remove ${date}`}>
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-paper/80">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-ink-border accent-flow"
            />
            Show on my public profile
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={saving}
            whileTap={{ scale: 0.98 }}
            className="mt-1 rounded-md bg-flow py-2.5 font-medium text-ink transition-colors hover:bg-flow/90 disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add task'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
