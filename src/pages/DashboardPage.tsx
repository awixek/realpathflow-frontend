import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ActiveTaskBar from '../components/ActiveTaskBar'
import DayProgressBox from '../components/DayProgressBox'
import DeleteRoadmapModal from '../components/DeleteRoadmapModal'
import LoadingState from '../components/LoadingState'
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
import { closeProgressNotification, onNotificationAction, showProgressNotification } from '../lib/notifications'
import { playSubtaskChime } from '../lib/sound'
import { useAuth } from '../lib/useAuth'

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { session } = useAuth()

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

  const handleTogglePauseRef = useRef<() => void>(() => {})
  const handleCompleteSubtaskRef = useRef<() => void>(() => {})

  // Notification action buttons call whatever the latest handler is,
  // without re-subscribing to the service worker on every render.
  useEffect(() => {
    return onNotificationAction((action) => {
      if (action === 'toggle-pause') handleTogglePauseRef.current()
      if (action === 'complete-step') handleCompleteSubtaskRef.current()
    })
  }, [])

  const activeSession = dashboard?.activeSession ?? null
  const activeTask = useMemo(
    () => dashboard?.tasks.find((t) => t.subtasks.some((s) => s.id === activeSession?.subtask_id)) ?? null,
    [dashboard, activeSession]
  )
  const activeSubtask = activeTask?.subtasks.find((s) => s.id === activeSession?.subtask_id) ?? null
  const livePercent = activeTask
    ? Math.round(
        (activeTask.subtasks.filter((s) => s.status === 'done').length / activeTask.subtasks.length) * 100
      )
    : 0

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

  handleTogglePauseRef.current = handleTogglePause
  handleCompleteSubtaskRef.current = handleCompleteSubtask

  // Keep the OS/browser notification in sync with the active task so
  // Pause/Resume and Complete step work from the notification itself.
  useEffect(() => {
    if (!activeTask || !activeSubtask || !activeSession) {
      closeProgressNotification()
      return
    }
    const isPaused = activeSession.status !== 'ACTIVE'
    showProgressNotification(
      activeTask.title,
      `${activeSubtask.title} · ${livePercent}% of this task`,
      isPaused
    )
  }, [activeTask, activeSubtask, activeSession, livePercent])

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <LoadingState label="Loading your roadmap…" />
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-lg px-6 py-24 text-center"
        >
          <div className="mx-auto mb-6 h-14 w-14 rounded-md border-2 border-black bg-ink-panel" />
          <h1 className="font-display text-2xl text-paper">No active roadmap yet</h1>
          <p className="mt-2 text-sm text-mute">Let AI help you build one, in a couple of minutes.</p>
          <Link
            to="/create-roadmap"
            className="mt-6 inline-block rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink hover:bg-flow/90"
          >
            Create your roadmap
          </Link>
        </motion.div>
      </div>
    )
  }

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
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="font-display text-2xl text-paper">{dashboard.roadmapTitle ?? "Today's roadmap"}</h1>
            <p className="mt-1 text-sm text-mute">Work through each task in order — one step at a time.</p>
            {dashboard.roadmapId && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="mt-2 text-xs text-mute hover:text-red-400"
              >
                Delete this roadmap
              </button>
            )}
          </motion.div>
          <DayProgressBox percent={dashboard.dayPercent} />
        </div>

        <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${busy ? 'pointer-events-none opacity-70' : ''}`}>
          {dashboard.tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <TaskBox task={task} isActive={task.id === activeTask?.id} onStart={handleStart} />
            </motion.div>
          ))}
        </div>
      </div>

      {showDeleteModal && dashboard.roadmapId && session?.user.email && (
        <DeleteRoadmapModal
          roadmapId={dashboard.roadmapId}
          roadmapTitle={dashboard.roadmapTitle ?? 'this roadmap'}
          email={session.user.email}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setShowDeleteModal(false)
            loadDashboard()
          }}
        />
      )}
    </div>
  )
}
