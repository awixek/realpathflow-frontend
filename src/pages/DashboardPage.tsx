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
import { closeProgressNotification, onNotificationAction, showProgressNotification, showTaskCompletionNotification } from '../lib/notifications'
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
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadDashboard()
    }, 30000)
    return () => window.clearInterval(id)
  }, [loadDashboard])

  // If the app was closed when a notification action was tapped, the service
  // worker opens this route with the action. The page then performs the same
  // authenticated backend transition as an in-app notification click.
  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get('notificationAction')
    if (!action || action === 'open') return
    const clean = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState({}, '', clean)
    // Dashboard data is loaded first; the normal notification listener below
    // handles already-open windows. Closed-window actions are intentionally
    // handled after the initial dashboard load.
    const timer = window.setTimeout(() => {
      if (action === 'toggle-pause') handleTogglePauseRef.current()
      if (action === 'complete-step') handleCompleteSubtaskRef.current()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [])

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
      await showTaskCompletionNotification(activeTask?.title ?? 'Task', `${activeSubtask?.title ?? 'Step'} completed. Today has been updated.`)
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
    const dailyRemaining = activeSession.daily_remaining_seconds ?? activeSession.daily_target_seconds ?? null
    const remainingLabel = dailyRemaining != null
      ? `${Math.floor(dailyRemaining / 3600)}h ${Math.floor((dailyRemaining % 3600) / 60)}m daily target remaining`
      : `${livePercent}% of this task`
    showProgressNotification(
      activeTask.title,
      `${activeSubtask.title} · ${remainingLabel}`,
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

  if (!dashboard || (!dashboard.roadmapId && dashboard.tasks.length === 0)) {
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

  if (dashboard.scheduledFor) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="font-display text-2xl text-paper">Your roadmap starts tomorrow</h1>
          <p className="mt-2 text-sm text-mute">Today is kept free. Your daily plan begins on {dashboard.scheduledFor}.</p>
          <Link to="/profile" className="mt-6 inline-block rounded-md border border-ink-border px-4 py-2 text-sm text-paper hover:border-flow">Set daily capacity</Link>
        </div>
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
            targetSeconds={activeSession.daily_target_seconds}
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
              <Link to={`/roadmaps/${dashboard.roadmapId}/edit`} className="mt-3 inline-flex items-center rounded-md border border-flow/50 px-3 py-1.5 text-xs font-medium text-flow hover:bg-flow/10">✦ Edit with AI</Link>
            )}
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

        {dashboard.adaptive && dashboard.adaptive.signal !== 'STABLE' && dashboard.adaptive.signal !== 'COMPLETE' && dashboard.roadmapId && (
          <div className="mb-6 rounded-xl border border-flow/30 bg-ink-panel p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-flow">Adaptive check</p>
                <h2 className="mt-1 font-display text-lg text-paper">Your execution pattern has changed.</h2>
                <p className="mt-1 text-sm text-mute">{dashboard.adaptive.recommendation ?? 'We can compare your planned pace with your actual execution and rebalance the roadmap.'}</p>
                <p className="mt-2 text-xs text-mute">Recent sustainable pace: {dashboard.adaptive.sustainable_daily_capacity_minutes}m/day · Remaining: {dashboard.adaptive.remaining_hours}h</p>
              </div>
              <Link to={`/roadmaps/${dashboard.roadmapId}/edit?adaptive=1`} className="shrink-0 rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink hover:bg-flow/90">Rebalance with AI</Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {([['KEEP_DEADLINE','Keep deadline'],['REDUCE_SCOPE','Reduce scope'],['INCREASE_DAILY_TIME','Increase daily time'],['EXTEND_DEADLINE','Extend deadline']] as const).map(([value,label]) => (
                <Link key={value} to={`/roadmaps/${dashboard.roadmapId}/edit?adaptive=1&strategy=${value}`} className="rounded-md border border-ink-border px-3 py-1.5 text-xs text-paper hover:border-flow hover:text-flow">{label}</Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-ink-border bg-ink-panel p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-mute">Today · {dashboard.date}</p>
              <h2 className="mt-1 font-display text-xl text-paper">{Math.floor(dashboard.dailyCapacitySeconds / 3600)}h {Math.round((dashboard.dailyCapacitySeconds % 3600) / 60)}m target capacity</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-paper">{Math.floor(dashboard.completedSeconds / 3600)}h {Math.round((dashboard.completedSeconds % 3600) / 60)}m completed</p>
              <p className="text-xs text-mute">{Math.floor(dashboard.remainingSecondsToday / 3600)}h {Math.round((dashboard.remainingSecondsToday % 3600) / 60)}m remaining</p>
            </div>
          </div>
          {dashboard.dailyCompleted && <div className="mt-4 rounded-lg border border-flow/40 bg-flow/10 px-4 py-3 text-sm text-flow">✓ Daily plan complete. Great work — your execution history has been recorded.</div>}
          {dashboard.plan?.items.length ? (
            <div className="mt-5 flex flex-col gap-3">
              {dashboard.plan.items.map((item) => (
                <div key={item.id} className={`flex items-center justify-between rounded-lg border px-3 py-3 ${item.remaining_seconds <= 0 ? 'border-flow/30 bg-flow/5' : 'border-black/60'}`}>
                  <div className="min-w-0"><p className="text-sm text-paper">{item.remaining_seconds <= 0 ? '✓ ' : ''}{item.task_title}</p><p className="truncate text-xs text-mute">{item.subtask_title}</p></div>
                  <span className="ml-3 whitespace-nowrap text-sm text-paper">{Math.floor(item.actual_seconds / 3600)}h {Math.round((item.actual_seconds % 3600) / 60)}m / {Math.floor(item.allocated_seconds / 3600)}h {Math.round((item.allocated_seconds % 3600) / 60)}m</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-mute">No executable work fits today's capacity, or all available work is complete.</p>}
          {dashboard.recommendedNextTask && <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-flow/30 px-4 py-3"><div><p className="text-xs uppercase tracking-wider text-mute">Recommended next</p><p className="mt-1 text-sm text-paper">{dashboard.recommendedNextTask.task_title} — {dashboard.recommendedNextTask.subtask_title}</p><p className="text-xs text-mute">{Math.floor(dashboard.recommendedNextTask.remaining_seconds / 3600)}h {Math.round((dashboard.recommendedNextTask.remaining_seconds % 3600) / 60)}m remaining today</p></div><span className="text-flow">→</span></div>}
          {dashboard.totalRemainingSeconds > 0 && dashboard.feasibilityDays && <p className="mt-2 text-xs text-mute">About {dashboard.feasibilityDays} days at this capacity for the remaining workload.</p>}
          {dashboard.roadmapDeadline && dashboard.deadlineInfeasible && <p className="mt-2 text-xs text-amber-300">At this capacity, the {dashboard.roadmapDeadline} deadline needs about {Math.ceil((dashboard.requiredDailySeconds ?? 0) / 60)} minutes/day, so the current pace is not enough.</p>}
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
