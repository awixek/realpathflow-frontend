import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ActiveTaskBar from '../components/ActiveTaskBar'
import DayProgressBox from '../components/DayProgressBox'
import NavBar from '../components/NavBar'
import TaskBox from '../components/TaskBox'
import {
  DashboardView,
  computeElapsedSeconds,
  completeSession,
  fetchDashboard,
  pauseSession,
  resumeSession,
  startSession
} from '../lib/dashboardApi'
import { playSubtaskChime } from '../lib/sound'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchDashboard()
      setDashboard(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong loading your roadmap.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Local ticker just for a smooth live display; the server's accumulated_seconds
  // stays the source of truth and is re-synced on every pause/resume/complete.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const activeSession = dashboard?.activeSession ?? null
  const activeTask = useMemo(
    () => dashboard?.tasks.find((t) => t.subtasks.some((s) => s.id === activeSession?.subtask_id)) ?? null,
    [dashboard, activeSession]
  )
  const activeSubtask = activeTask?.subtasks.find((s) => s.id === activeSession?.subtask_id) ?? null

  async function handleStart(taskId: string) {
    const task = dashboard?.tasks.find((t) => t.id === taskId)
    const firstPending = task?.subtasks.find((s) => s.status === 'pending')
    if (!firstPending) return

    setBusy(true)
    try {
      await startSession(firstPending.id)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start this task.')
    } finally {
      setBusy(false)
    }
  }

  async function handleTogglePause() {
    if (!activeSession) return
    setBusy(true)
    try {
      if (activeSession.status === 'ACTIVE') {
        await pauseSession(activeSession.id)
      } else {
        await resumeSession(activeSession.id)
      }
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the session.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCompleteSubtask() {
    if (!activeSession) return
    setBusy(true)
    try {
      await completeSession(activeSession.id)
      playSubtaskChime()
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete this step.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <p className="px-6 py-10 text-sm text-mute">Loading your roadmap…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="mx-auto max-w-lg px-6 py-10">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 rounded-md border border-ink-border px-3 py-1.5 text-sm text-paper hover:border-flow"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!dashboard || dashboard.tasks.length === 0) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="font-display text-2xl text-paper">No active roadmap yet</h1>
          <p className="mt-2 text-sm text-mute">
            Roadmap creation is coming in a future update — check back soon.
          </p>
        </div>
      </div>
    )
  }

  const livePercent = activeTask
    ? Math.round(
        (activeTask.subtasks.filter((s) => s.status === 'done').length / activeTask.subtasks.length) * 100
      )
    : 0

  return (
    <div className="min-h-screen">
      <NavBar />

      <AnimatePresence>
        {activeTask && activeSubtask && activeSession && (
          <ActiveTaskBar
            task={activeTask}
            isPaused={activeSession.status !== 'ACTIVE'}
            elapsedSeconds={Math.floor(computeElapsedSeconds(activeSession, now))}
            livePercent={livePercent}
            onTogglePause={handleTogglePause}
            onCompleteSubtask={handleCompleteSubtask}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-paper">{dashboard.roadmapTitle ?? "Today's roadmap"}</h1>
            <p className="mt-1 text-sm text-mute">Work through each task in order — one step at a time.</p>
          </div>
          <DayProgressBox percent={dashboard.dayPercent} />
        </div>

        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${busy ? 'pointer-events-none opacity-70' : ''}`}>
          {dashboard.tasks.map((task) => (
            <TaskBox key={task.id} task={task} isActive={task.id === activeTask?.id} onStart={handleStart} />
          ))}
        </div>
      </div>
    </div>
  )
}
