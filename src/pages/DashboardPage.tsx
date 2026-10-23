import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import InlineNotice from '../components/InlineNotice'
import { AnimatePresence, motion } from 'framer-motion'
import AddTaskModal from '../components/AddTaskModal'
import DayProgressBox from '../components/DayProgressBox'
import { DashboardSkeleton } from '../components/LoadingState'
import NavBar from '../components/NavBar'
import SessionBar from '../components/SessionBar'
import TaskCard from '../components/TaskCard'
import { formatHoursMinutes, todayIso } from '../lib/time'
import { createTask, deleteTask, listTasks, TaskDraft, updateTask } from '../lib/tasksApi'
import { getDailyProgress } from '../lib/profileApi'
import { useActiveSession } from '../lib/ActiveSessionContext'
import { DailyProgress, Task } from '../types'
import { friendlyError } from '../lib/errorMessages'

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [daily, setDaily] = useState<DailyProgress | null>(null)
  const [dailySnapshotAt, setDailySnapshotAt] = useState(Date.now())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingFailed, setLoadingFailed] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const session = useActiveSession()
  const previousSessionId = useRef<string | null | undefined>(undefined)

  const refresh = useCallback(async () => {
    const [taskList, dailyProgress] = await Promise.all([listTasks(), getDailyProgress()])
    setTasks(taskList)
    setDaily(dailyProgress)
    setDailySnapshotAt(Date.now())
  }, [])

  useEffect(() => {
    refresh().catch((err) => {
      setError(friendlyError(err, 'Couldn’t load your tasks. Please try again.'))
      setLoadingFailed(true)
    })
  }, [refresh])

  // Reconcile daily totals when a server-side auto-stop clears the timer.
  // Without this refresh, the last client-only live increment could disappear
  // from the visible per-task percentage until the next manual refresh.
  useEffect(() => {
    const currentId = session.activeSession?.id ?? null
    const previousId = previousSessionId.current
    previousSessionId.current = currentId
    if (previousId && !currentId) {
      refresh().catch((err) => setError(friendlyError(err, 'Couldn’t refresh today’s progress.')))
    }
  }, [session.activeSession?.id, refresh])

  // A target can be detected during the very first session restore, before a
  // previous activeSession ID exists. Refreshing on the celebration also makes
  // that first-load path update the visible daily totals after server auto-stop.
  useEffect(() => {
    if (!session.celebration) return
    refresh().catch((err) => setError(friendlyError(err, 'Couldn’t refresh today’s progress.')))
  }, [session.celebration, refresh])

  // Refresh daily totals at India midnight so the visible percentage rolls
  // over with the same calendar boundary used by the backend history ledger.
  useEffect(() => {
    let lastIstDate = todayIso()
    const checkIstDate = () => {
      const currentIstDate = todayIso()
      if (currentIstDate === lastIstDate) return
      lastIstDate = currentIstDate
      refresh().catch((err) => setError(friendlyError(err, 'Couldn’t refresh today’s progress.')))
    }
    const timer = window.setInterval(checkIstDate, 15000)
    window.addEventListener('focus', checkIstDate)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', checkIstDate)
    }
  }, [refresh])

  const ongoingTasks = useMemo(() => (tasks ?? []).filter((t) => t.status === 'ongoing'), [tasks])
  const upcomingCount = useMemo(() => (tasks ?? []).filter((t) => t.status === 'upcoming').length, [tasks])

  const percent = daily && daily.required_seconds > 0
    ? Math.min(100, Math.round((daily.logged_seconds / daily.required_seconds) * 100))
    : 0

  async function handleCreateTask(draft: TaskDraft) {
    await createTask(draft)
    setShowAddModal(false)
    await refresh()
  }

  async function handleEditTask(draft: TaskDraft) {
    if (!editingTask) return
    await updateTask(editingTask.id, draft)
    setEditingTask(null)
    await refresh()
  }

  async function handleStart(taskId: string) {
    const task = tasks?.find((t) => t.id === taskId)
    if (!task) return
    await session.start(task)
    await refresh()
  }

  async function handlePause() {
    await session.pause()
    await refresh()
  }

  async function handleResume() {
    await session.resume()
    await refresh()
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.name}"? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await deleteTask(task.id)
      await refresh()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const activeTask = tasks?.find((t) => t.id === session.activeTaskId)
  const isBusy = busy || session.busy

  if (tasks === null || daily === null) {
    return (
      <div className="min-h-screen bg-ink">
        <NavBar />
        {loadingFailed ? (
          <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
            <p className="font-display text-lg text-paper">Couldn’t load today’s workspace.</p>
            <p className="text-sm text-mute">Your data is safe. Try loading it again.</p>
            <button
              onClick={() => { setLoadingFailed(false); setError(''); refresh().catch((err) => { setError(friendlyError(err, 'Couldn’t load your tasks. Please try again.')); setLoadingFailed(true) }) }}
              className="rounded-md bg-flow px-4 py-2.5 text-sm font-medium text-ink hover:bg-flow/90"
            >
              Try again
            </button>
          </main>
        ) : <DashboardSkeleton />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <NavBar />

      <AnimatePresence>
        {session.activeSession && session.activeSession.status !== 'COMPLETED' && (
          <SessionBar
            session={session.activeSession}
            task={activeTask}
            loggedSecondsToday={daily.tasks.find((item) => item.task_id === session.activeTaskId)?.logged_seconds ?? 0}
            dailySnapshotAt={dailySnapshotAt}
            onPause={handlePause}
            onResume={handleResume}
            busy={isBusy}
          />
        )}
      </AnimatePresence>

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
        <section className="flex flex-col items-center gap-4 rounded-lg border border-ink-border p-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <DayProgressBox percent={percent} />
            <div>
              <p className="font-display text-lg text-paper">
                {formatHoursMinutes(daily.logged_seconds)} of {formatHoursMinutes(daily.required_seconds)}
              </p>
              <p className="text-sm text-mute">
                {daily.is_complete
                  ? "Today's box is full."
                  : daily.required_seconds === 0
                    ? 'No tasks are active today.'
                    : `${formatHoursMinutes(Math.max(0, daily.required_seconds - daily.logged_seconds))} left to go green.`}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddModal(true)}
            className="rounded-md bg-flow px-4 py-2.5 text-sm font-medium text-ink hover:bg-flow/90"
          >
            + Add task
          </motion.button>
        </section>

        {(error || session.error) && (
          <InlineNotice>{error || session.error}</InlineNotice>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base text-paper">Ongoing ({ongoingTasks.length})</h2>
            {upcomingCount > 0 && (
              <span className="text-xs text-mute">{upcomingCount} upcoming — see Profile</span>
            )}
          </div>

          {ongoingTasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-border p-6 text-center text-sm text-mute">
              No tasks running today. Add one to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ongoingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  activeSession={session.activeSession}
                  loggedSecondsToday={daily.tasks.find((item) => item.task_id === task.id)?.logged_seconds ?? 0}
                  dailySnapshotAt={dailySnapshotAt}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onEdit={setEditingTask}
                  onDelete={handleDelete}
                  busy={isBusy}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showAddModal && (
          <AddTaskModal onClose={() => setShowAddModal(false)} onCreate={handleCreateTask} mode="create" />
        )}
        {editingTask && (
          <AddTaskModal
            key={editingTask.id}
            initialTask={editingTask}
            mode="edit"
            onClose={() => setEditingTask(null)}
            onCreate={handleEditTask}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
