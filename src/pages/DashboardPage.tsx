import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AddTaskModal from '../components/AddTaskModal'
import DayProgressBox from '../components/DayProgressBox'
import LoadingState from '../components/LoadingState'
import NavBar from '../components/NavBar'
import SessionBar from '../components/SessionBar'
import TaskCard from '../components/TaskCard'
import { formatHoursMinutes } from '../lib/time'
import {
  completeSession,
  createTask,
  deleteTask,
  getActiveSession,
  listTasks,
  pauseSession,
  resumeSession,
  startSession,
  TaskDraft
} from '../lib/tasksApi'
import { getDailyProgress } from '../lib/profileApi'
import { DailyProgress, Task, TaskSession } from '../types'
import { playSubtaskChime } from '../lib/sound'
import { requestNotificationPermission, showTaskCompletionNotification } from '../lib/notifications'

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [daily, setDaily] = useState<DailyProgress | null>(null)
  const [activeSession, setActiveSession] = useState<TaskSession | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const [elapsedBase, setElapsedBase] = useState(0)
  const [elapsedBaseAt, setElapsedBaseAt] = useState<number>(Date.now())
  const [liveElapsed, setLiveElapsed] = useState(0)

  const tickRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    const [taskList, dailyProgress, session] = await Promise.all([
      listTasks(),
      getDailyProgress(),
      getActiveSession()
    ])
    setTasks(taskList)
    setDaily(dailyProgress)
    setActiveSession(session)
    if (session) {
      setElapsedBase(session.elapsed_seconds)
      setElapsedBaseAt(Date.now())
    }
  }, [])

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'Could not load your tasks.'))
  }, [refresh])

  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current)
    if (activeSession?.status === 'ACTIVE') {
      tickRef.current = window.setInterval(() => {
        setLiveElapsed(elapsedBase + Math.floor((Date.now() - elapsedBaseAt) / 1000))
      }, 1000)
    } else {
      setLiveElapsed(elapsedBase)
    }
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [activeSession, elapsedBase, elapsedBaseAt])

  const ongoingTasks = useMemo(() => (tasks ?? []).filter((t) => t.status === 'ongoing'), [tasks])
  const upcomingCount = useMemo(() => (tasks ?? []).filter((t) => t.status === 'upcoming').length, [tasks])

  const percent = daily && daily.required_seconds > 0
    ? Math.min(100, Math.round((daily.logged_seconds / daily.required_seconds) * 100))
    : 0

  async function withBusy<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true)
    setError('')
    try {
      return await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      return undefined
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateTask(draft: TaskDraft) {
    await createTask(draft)
    setShowAddModal(false)
    await refresh()
  }

  async function handleStart(taskId: string) {
    requestNotificationPermission()
    await withBusy(async () => {
      const session = await startSession(taskId)
      setActiveSession(session)
      setElapsedBase(session.elapsed_seconds)
      setElapsedBaseAt(Date.now())
    })
  }

  async function handlePause(sessionId: string) {
    await withBusy(async () => {
      const session = await pauseSession(sessionId)
      setActiveSession(session)
      setElapsedBase(session.elapsed_seconds)
      setElapsedBaseAt(Date.now())
    })
  }

  async function handleResume(sessionId: string) {
    await withBusy(async () => {
      const session = await resumeSession(sessionId)
      setActiveSession(session)
      setElapsedBase(session.elapsed_seconds)
      setElapsedBaseAt(Date.now())
    })
  }

  async function handleComplete(sessionId: string) {
    await withBusy(async () => {
      await completeSession(sessionId)
      playSubtaskChime()
      showTaskCompletionNotification('Session logged', 'Nice work — your time has been recorded.')
      setActiveSession(null)
      setElapsedBase(0)
      await refresh()
    })
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.name}"? This cannot be undone.`)) return
    await withBusy(async () => {
      await deleteTask(task.id)
      await refresh()
    })
  }

  const activeTask = tasks?.find((t) => t.id === activeSession?.task_id)

  if (tasks === null || daily === null) {
    return (
      <div className="min-h-screen bg-ink">
        <NavBar />
        <LoadingState label="Loading today…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <NavBar />

      <AnimatePresence>
        {activeSession && activeSession.status !== 'COMPLETED' && (
          <SessionBar
            session={activeSession}
            task={activeTask}
            liveElapsedSeconds={liveElapsed}
            onPause={() => handlePause(activeSession.id)}
            onResume={() => handleResume(activeSession.id)}
            onComplete={() => handleComplete(activeSession.id)}
            busy={busy}
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

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
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
                  activeSession={activeSession}
                  liveElapsedSeconds={liveElapsed}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showAddModal && (
          <AddTaskModal onClose={() => setShowAddModal(false)} onCreate={handleCreateTask} />
        )}
      </AnimatePresence>
    </div>
  )
}
