import { useCallback, useEffect, useState } from 'react'
import { ProfileSkeleton } from '../components/LoadingState'
import NavBar from '../components/NavBar'
import TaskCard from '../components/TaskCard'
import ProfileHistoryHeatmap from '../components/ProfileHistoryHeatmap'
import { formatHoursMinutes } from '../lib/time'
import { deleteTask, updateTask } from '../lib/tasksApi'
import { getCurrentUserProfile, getProfileSummary } from '../lib/profileApi'
import { ProfileSummary, Task } from '../types'
import { friendlyError } from '../lib/errorMessages'
import { disablePushNotifications, enablePushNotifications, getPushConfig } from '../lib/pushApi'
import { getPushSubscription } from '../lib/notifications'

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
  const [loadingFailed, setLoadingFailed] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushAvailable, setPushAvailable] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setSummary(await getProfileSummary())
  }, [])

  useEffect(() => {
    getPushConfig().then(async (config) => {
      setPushAvailable(config.enabled && !!config.public_key)
      if (config.enabled) setPushEnabled(!!(await getPushSubscription()))
    }).catch(() => setPushAvailable(false))
    getCurrentUserProfile().then((me) => setUsername(me.profile?.username ?? null)).catch(() => setUsername(null))
    refresh().catch((err) => { setError(friendlyError(err, 'Couldn’t load your profile. Please try again.')); setLoadingFailed(true) })
  }, [refresh])

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.name}"? This cannot be undone.`)) return
    try {
      await deleteTask(task.id)
      await refresh()
    } catch (err) {
      setError(friendlyError(err, 'Couldn’t delete the task. Please try again.'))
    }
  }

  async function handleTogglePublic(task: Task) {
    try {
      await updateTask(task.id, { is_public: !task.is_public })
      await refresh()
    } catch (err) {
      setError(friendlyError(err, 'Couldn’t update the task. Please try again.'))
    }
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-ink">
        <NavBar />
        {loadingFailed ? (
          <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
            <p className="font-display text-lg text-paper">Couldn’t load your profile.</p>
            <p className="text-sm text-mute">Your data is safe. Try again.</p>
            <button
              onClick={() => { setLoadingFailed(false); setError(''); refresh().catch((err) => { setError(friendlyError(err, 'Couldn’t load your profile. Please try again.')); setLoadingFailed(true) }) }}
              className="rounded-md bg-flow px-4 py-2.5 text-sm font-medium text-ink hover:bg-flow/90"
            >
              Try again
            </button>
          </main>
        ) : <ProfileSkeleton />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <NavBar />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
        {pushAvailable && (
          <section className="rounded-lg border border-ink-border p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-paper">Phone reminders</p>
                <p className="mt-1 text-sm text-mute">Get a reminder even when RealPathFlow is closed.</p>
              </div>
              <button
                disabled={pushBusy}
                onClick={async () => {
                  setPushBusy(true)
                  try {
                    const config = await getPushConfig()
                    if (!config.public_key) throw new Error('Push notifications are not configured yet.')
                    if (pushEnabled) { await disablePushNotifications(); setPushEnabled(false) }
                    else { await enablePushNotifications(config.public_key); setPushEnabled(true) }
                  } catch (err) { setError(friendlyError(err, 'Couldn’t update phone reminders. Please try again.')) }
                  finally { setPushBusy(false) }
                }}
                className="rounded-md border border-ink-border px-4 py-2 text-sm text-paper transition-colors hover:border-flow disabled:opacity-50"
              >
                {pushBusy ? 'Updating…' : pushEnabled ? 'Turn off reminders' : 'Enable reminders'}
              </button>
            </div>
          </section>
        )}

        {username && (
          <section className="rounded-lg border border-ink-border p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-paper">Your public profile</p>
                <p className="mt-1 text-sm text-mute">Only tasks you explicitly mark public are shown.</p>
              </div>
              <a
                href={`/u/${encodeURIComponent(username)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-ink-border px-4 py-2 text-center text-sm text-paper hover:border-flow"
              >
                View public profile
              </a>
            </div>
          </section>
        )}

        <ProfileHistoryHeatmap />

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
