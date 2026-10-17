import { useEffect, useState } from 'react'
import { todayIso } from '../lib/time'
import { getTaskDailyNote, saveTaskDailyNote } from '../lib/taskProgressApi'
import { friendlyError } from '../lib/errorMessages'

export default function TaskDailyNoteEditor({ taskId, taskStartDate, taskEndDate }: {
  taskId: string
  taskStartDate: string
  taskEndDate: string
}) {
  const noteDate = todayIso()
  const [note, setNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setMessage('')
    getTaskDailyNote(taskId, noteDate)
      .then((result) => {
        if (cancelled) return
        setNote(result.note)
        setSavedNote(result.note)
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyError(err, 'Couldn’t load today’s note.'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [taskId, noteDate])

  const changed = note.trim() !== savedNote
  const dateInTaskRange = noteDate >= taskStartDate && noteDate <= taskEndDate

  async function handleSave() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveTaskDailyNote(taskId, noteDate, note)
      setNote(saved.note)
      setSavedNote(saved.note)
      setMessage(saved.note ? 'Saved for today.' : 'Today’s note cleared.')
    } catch (err) {
      setError(friendlyError(err, 'Couldn’t save today’s note. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  if (!dateInTaskRange) return null

  return (
    <div className="rounded-md border border-ink-border/80 bg-ink-panel/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={`daily-note-${taskId}`} className="text-sm font-medium text-paper">Daily note</label>
        <span className="text-[11px] text-mute">{note.length}/2000</span>
      </div>
      <textarea
        id={`daily-note-${taskId}`}
        value={note}
        onChange={(event) => { setNote(event.target.value); setMessage(''); setError('') }}
        disabled={loading || saving}
        maxLength={2000}
        rows={3}
        placeholder="What did you learn or complete today? Add a reminder for next time…"
        className="w-full resize-y rounded-md border border-ink-border bg-ink px-3 py-2 text-sm text-paper placeholder:text-mute/70 focus:border-flow focus:outline-none disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className={`text-xs ${error ? 'text-red-400' : 'text-mute'}`} role={error ? 'alert' : 'status'}>
          {error || message || (loading ? 'Loading note…' : 'Private • saved by date')}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving || !changed}
          className="shrink-0 rounded-md border border-flow px-3 py-1.5 text-xs font-medium text-flow hover:bg-flow hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </div>
  )
}
