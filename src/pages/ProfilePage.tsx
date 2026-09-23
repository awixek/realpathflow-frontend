import { useCallback, useEffect, useState } from 'react'
import LoadingState from '../components/LoadingState'
import NavBar from '../components/NavBar'
import TaskCard from '../components/TaskCard'
import { formatHoursMinutes } from '../lib/time'
import { deleteTask, updateTask } from '../lib/tasksApi'
import { getProfileSummary } from '../lib/profileApi'
import { ProfileSummary, Task } from '../types'

function Section({ title, tasks, onDelete, onTogglePublic }: {
  title: string
  tasks: Task[]
  onDelete: (task: Task) => void
  onTogglePublic: (task: Task) => void
}) {
  if (tasks.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base text-paper">
        {title} ({tasks.length})
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            activeSession={null}
            liveElapsedSeconds={0}
            onStart={() => {}}
            onPause={() => {}}
            onResume={() => {}}
            onComplete={() => {}}
            onDelete={onDelete}
            onTogglePublic={onTogglePublic}
            busy={false}
          />
        ))}
      </div>
    </section>
  )
}

export default function ProfilePage() {
  const [summary, setSummary] = useState<ProfileSummary | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setSummary(await getProfileSummary())
  }, [])

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'Could not load your profile.'))
  }, [refresh])

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.name}"? This cannot be undone.`)) return
    try {
      await deleteTask(task.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the task.')
    }
  }

  async function handleTogglePublic(task: Task) {
    try {
      await updateTask(task.id, { is_public: !task.is_public })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the task.')
    }
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-ink">
        <NavBar />
        <LoadingState label="Loading your profile…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <NavBar />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
        <section className="rounded-lg border border-ink-border p-6 text-center">
          <p className="text-sm text-mute">Total hours of progression</p>
          <p className="mt-1 font-display text-4xl text-flow">
            {formatHoursMinutes(summary.total_logged_seconds)}
          </p>
          <div className="mt-4 flex justify-center gap-6 text-sm text-mute">
            <span>{summary.ongoing_count} ongoing</span>
            <span>{summary.completed_count} completed</span>
            <span>{summary.upcoming_count} upcoming</span>
          </div>
        </section>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <Section
          title="Ongoing"
          tasks={summary.ongoing_tasks}
          onDelete={handleDelete}
          onTogglePublic={handleTogglePublic}
        />
        <Section
          title="Upcoming"
          tasks={summary.upcoming_tasks}
          onDelete={handleDelete}
          onTogglePublic={handleTogglePublic}
        />
        <Section
          title="Completed"
          tasks={summary.completed_tasks}
          onDelete={handleDelete}
          onTogglePublic={handleTogglePublic}
        />

        {summary.ongoing_count + summary.completed_count + summary.upcoming_count === 0 && (
          <p className="rounded-lg border border-dashed border-ink-border p-6 text-center text-sm text-mute">
            No tasks yet. Add one from the Today page.
          </p>
        )}
      </main>
    </div>
  )
}
