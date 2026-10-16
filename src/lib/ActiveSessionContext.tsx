import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import {
  getActiveSession,
  getTask,
  listTasks,
  pauseSession,
  resumeSession,
  startSession,
} from './tasksApi'
import { getDailyProgress } from './profileApi'
import { friendlyError } from './errorMessages'
import {
  closeProgressNotification,
  onNotificationAction,
  requestNotificationPermission,
  showProgressNotification,
  showTaskCompletionNotification
} from './notifications'
import { playSubtaskChime, prepareCompletionSound } from './sound'
import { formatHoursMinutes, minutesToLabel, todayIso } from './time'
import { Task, TaskSession } from '../types'

export interface Celebration {
  taskName: string
}

interface ActiveSessionContextValue {
  activeSession: TaskSession | null
  activeTaskId: string | null
  activeTaskName: string | null
  liveElapsedSeconds: number
  busy: boolean
  error: string
  /** Set briefly when a task's daily target is reached. */
  celebration: Celebration | null
  dismissCelebration: () => void
  /** Start a new task or resume its saved paused session. */
  start: (task: Task) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  /** Re-pulls the active session from the server - useful after task list changes elsewhere. */
  refresh: () => Promise<void>
}

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null)

// Notification content is refreshed once per minute. Server reconciliation stays
// faster, and a near-target probe kicks in when the daily target is almost done.
const NOTIFICATION_RESYNC_SECONDS = 60
const SERVER_RECONCILE_SECONDS = 15
const TARGET_PROBE_MIN_INTERVAL_MS = 5000

type EligibleNextTask = Pick<Task, 'id' | 'name'>

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const { session: authSession } = useAuth()

  const [activeSession, setActiveSession] = useState<TaskSession | null>(null)
  const [activeTaskName, setActiveTaskName] = useState<string | null>(null)
  const [activeTaskDailyMinutes, setActiveTaskDailyMinutes] = useState<number | null>(null)
  const [activeTaskLoggedTodaySeconds, setActiveTaskLoggedTodaySeconds] = useState<number | null>(null)
  const [dailySnapshotAt, setDailySnapshotAt] = useState(Date.now())
  const [dailySnapshotDate, setDailySnapshotDate] = useState(todayIso())
  const [dailySnapshotTaskId, setDailySnapshotTaskId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const dismissCelebration = useCallback(() => setCelebration(null), [])

  const [elapsedBase, setElapsedBase] = useState(0)
  const [elapsedBaseAt, setElapsedBaseAt] = useState(Date.now())
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0)

  const tickRef = useRef<number | null>(null)
  const activeSessionRef = useRef<TaskSession | null>(null)
  const handledCompletionIdsRef = useRef<Set<string>>(new Set())
  const reconcileInFlightRef = useRef(false)
  const lastTargetProbeAtRef = useRef(0)
  const handledDeepLinkRef = useRef<Set<string>>(new Set())
  const dailySnapshotRequestRef = useRef(0)
  const sessionMutationVersionRef = useRef(0)

  useEffect(() => {
    activeSessionRef.current = activeSession
  }, [activeSession])

  const applySession = useCallback((s: TaskSession | null) => {
    sessionMutationVersionRef.current += 1
    setActiveSession(s)
    setElapsedBase(s?.elapsed_seconds ?? 0)
    setElapsedBaseAt(Date.now())
    setLiveElapsedSeconds(s?.elapsed_seconds ?? 0)
  }, [])

  const syncTaskDailyProgress = useCallback(async (taskId: string) => {
    const requestId = ++dailySnapshotRequestRef.current
    try {
      const daily = await getDailyProgress()
      if (requestId !== dailySnapshotRequestRef.current) return
      const entry = daily.tasks.find((item) => item.task_id === taskId)
      setActiveTaskLoggedTodaySeconds(entry?.logged_seconds ?? 0)
      setDailySnapshotAt(Date.now())
      setDailySnapshotDate(daily.date || todayIso())
      setDailySnapshotTaskId(taskId)
    } catch {
      if (requestId !== dailySnapshotRequestRef.current) return
      // If the daily summary endpoint is temporarily unavailable, the server
      // remains authoritative for auto-stop; notification progress falls back
      // to the session elapsed time until the next successful sync.
      setActiveTaskLoggedTodaySeconds(null)
      setDailySnapshotAt(Date.now())
      setDailySnapshotDate(todayIso())
      setDailySnapshotTaskId(taskId)
    }
  }, [])

  const findNextEligibleTask = useCallback(async (excludeTaskId: string): Promise<EligibleNextTask | null> => {
    const [tasks, daily] = await Promise.all([listTasks(), getDailyProgress()])
    const byTaskId = new Map(daily.tasks.map((item) => [item.task_id, item.logged_seconds]))

    // Preserve the API's task order so the notification's next-task choice is
    // stable. Only suggest tasks active today whose own daily target is not met.
    for (const task of tasks) {
      if (task.id === excludeTaskId || task.status !== 'ongoing' || task.daily_minutes <= 0) continue
      const loggedToday = byTaskId.get(task.id)
      if (loggedToday === undefined) continue
      if (loggedToday < task.daily_minutes * 60) return { id: task.id, name: task.name }
    }
    return null
  }, [])

  const handleTargetReached = useCallback(async (
    sessionId: string,
    taskId: string,
    taskName: string,
    dailyMinutes: number | null
  ) => {
    if (handledCompletionIdsRef.current.has(sessionId)) return
    handledCompletionIdsRef.current.add(sessionId)

    // Stop the UI timer immediately; the backend has already persisted the
    // COMPLETED session and closed its active segment at the target timestamp.
    applySession(null)
    setActiveTaskName(null)
    setActiveTaskDailyMinutes(null)
    setActiveTaskLoggedTodaySeconds(null)
    closeProgressNotification()
    setCelebration({ taskName })

    // Audio can be blocked by the browser when it has suspended the page or
    // the user has not interacted recently. Do not let that block notifications.
    try { playSubtaskChime() } catch (err) { console.debug('Completion chime was blocked', err) }

    let nextTask: EligibleNextTask | null = null
    try {
      nextTask = await findNextEligibleTask(taskId)
    } catch {
      // Completion is still announced if the task list cannot be fetched.
    }

    // If the person manually started another task while the next-task lookup
    // was in flight, don't put a stale Start action on that task's notification.
    if (activeSessionRef.current?.status === 'ACTIVE') nextTask = null

    const targetLabel = dailyMinutes && dailyMinutes > 0 ? minutesToLabel(dailyMinutes) : 'daily'
    const nextLine = nextTask ? ` Next up: ${nextTask.name}.` : ''
    const body = `"${taskName}" completed its ${targetLabel} target for today.${nextLine}`
    await showTaskCompletionNotification(`${taskName} complete 🎉`, body, nextTask ?? undefined)
  }, [applySession, findNextEligibleTask])

  const clearCurrentTask = useCallback(() => {
    applySession(null)
    setActiveTaskName(null)
    setActiveTaskDailyMinutes(null)
    setActiveTaskLoggedTodaySeconds(null)
  }, [applySession])

  // Restore the server's timer when the app opens, refreshes, or the auth state changes.
  const refresh = useCallback(async () => {
    if (!authSession) {
      clearCurrentTask()
      closeProgressNotification()
      return
    }
    const requestVersion = sessionMutationVersionRef.current
    try {
      const s = await getActiveSession()
      if (requestVersion !== sessionMutationVersionRef.current) return
      if (s && s.auto_stop_reason) {
        const task = await getTask(s.task_id).catch(() => null)
        if (requestVersion !== sessionMutationVersionRef.current) return
        const taskName = task?.name ?? 'Task'
        if (s.auto_stop_reason === 'target_reached') {
          await handleTargetReached(s.id, s.task_id, taskName, task?.daily_minutes ?? null)
        } else {
          clearCurrentTask()
          await showTaskCompletionNotification('Timer paused for safety', `"${taskName}" was stopped after a long unattended session.`)
        }
        return
      }
      applySession(s)
      const appliedVersion = sessionMutationVersionRef.current
      if (s) {
        const task = await getTask(s.task_id).catch(() => null)
        if (appliedVersion !== sessionMutationVersionRef.current) return
        setActiveTaskName(task?.name ?? null)
        setActiveTaskDailyMinutes(task?.daily_minutes ?? null)
        void syncTaskDailyProgress(s.task_id)
      } else {
        setActiveTaskName(null)
        setActiveTaskDailyMinutes(null)
        setActiveTaskLoggedTodaySeconds(null)
      }
    } catch {
      // Not fatal - keep the last known display if a transient network error occurs.
    }
  }, [authSession, applySession, clearCurrentTask, handleTargetReached, syncTaskDailyProgress])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const start = useCallback(async (task: Task) => {
    // Unlock the completion melody from this user gesture; browsers may block
    // audio contexts first created only after a background timer completes.
    void prepareCompletionSound()
    await requestNotificationPermission()
    await withBusy(async () => {
      const s = await startSession(task.id)
      if (s.status === 'COMPLETED' || s.auto_stop_reason) {
        if (s.auto_stop_reason === 'target_reached') {
          await handleTargetReached(s.id, task.id, task.name, task.daily_minutes)
        } else {
          clearCurrentTask()
        }
        return
      }
      applySession(s)
      setActiveTaskName(task.name)
      setActiveTaskDailyMinutes(task.daily_minutes)
      void syncTaskDailyProgress(task.id)
    })
  }, [applySession, clearCurrentTask, handleTargetReached, syncTaskDailyProgress])

  const pause = useCallback(async () => {
    const current = activeSessionRef.current
    if (!current) return
    await withBusy(async () => {
      const s = await pauseSession(current.id)
      applySession(s)
      void syncTaskDailyProgress(s.task_id)
    })
  }, [applySession, syncTaskDailyProgress])

  const resume = useCallback(async () => {
    const current = activeSessionRef.current
    if (!current) return
    await withBusy(async () => {
      const s = await resumeSession(current.id)
      if (s.auto_stop_reason === 'target_reached' || s.status === 'COMPLETED') {
        const task = await getTask(s.task_id).catch(() => null)
        if (s.auto_stop_reason === 'target_reached') {
          await handleTargetReached(s.id, s.task_id, task?.name ?? activeTaskName ?? 'Task', task?.daily_minutes ?? activeTaskDailyMinutes)
        } else {
          clearCurrentTask()
        }
        return
      }
      applySession(s)
      const task = await getTask(s.task_id).catch(() => null)
      setActiveTaskName(task?.name ?? activeTaskName)
      setActiveTaskDailyMinutes(task?.daily_minutes ?? activeTaskDailyMinutes)
      void syncTaskDailyProgress(s.task_id)
    })
  }, [activeTaskDailyMinutes, activeTaskName, applySession, clearCurrentTask, handleTargetReached, syncTaskDailyProgress])

  const startTaskById = useCallback(async (taskId: string) => {
    try {
      const tasks = await listTasks()
      const task = tasks.find((item) => item.id === taskId && item.status === 'ongoing')
      if (!task) return
      const daily = await getDailyProgress()
      const loggedToday = daily.tasks.find((item) => item.task_id === task.id)?.logged_seconds
      if (loggedToday === undefined || loggedToday >= task.daily_minutes * 60) {
        // The task may have reached its target on another device between the
        // notification being shown and the person tapping Start.
        await showTaskCompletionNotification('Daily target already complete', `"${task.name}" has already reached today's target.`)
        return
      }
      await start(task)
    } catch (err) {
      setError(friendlyError(err, 'Couldn’t start the next task. Open RealPathFlow and try again.'))
    }
  }, [start])

  // Keep the daily snapshot aligned with India midnight. Otherwise a task that
  // ran yesterday could appear to have already met today's target just after midnight.
  useEffect(() => {
    let lastIstDate = todayIso()
    const checkDate = () => {
      const currentDate = todayIso()
      if (currentDate === lastIstDate) return
      lastIstDate = currentDate
      const current = activeSessionRef.current
      if (current) void syncTaskDailyProgress(current.task_id)
    }
    const timer = window.setInterval(checkDate, 15000)
    window.addEventListener('focus', checkDate)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', checkDate)
    }
  }, [syncTaskDailyProgress])

  // Live clock, notification updates, and server reconciliation. The client
  // estimates the daily target boundary from the daily-summary snapshot, then
  // asks the backend to confirm it every few seconds near the target. The
  // backend remains authoritative and writes the exact target time to history.
  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current)

    if (!activeSession || activeSession.status === 'COMPLETED') {
      setLiveElapsedSeconds(0)
      closeProgressNotification()
      return
    }

    const trackedSession = activeSession
    const currentElapsed = trackedSession.status === 'ACTIVE'
      ? elapsedBase + Math.floor((Date.now() - elapsedBaseAt) / 1000)
      : elapsedBase
    setLiveElapsedSeconds(currentElapsed)

    const getProjectedTodaySeconds = () => {
      if (dailySnapshotDate !== todayIso() || dailySnapshotTaskId !== trackedSession.task_id || activeTaskLoggedTodaySeconds === null) return null
      const inFlightSeconds = trackedSession.status === 'ACTIVE'
        ? Math.floor(Math.max(0, Date.now() - dailySnapshotAt) / 1000)
        : 0
      return activeTaskLoggedTodaySeconds + inFlightSeconds
    }

    const notify = (elapsed: number) => {
      const name = activeTaskName ?? 'Task'
      const targetSeconds = activeTaskDailyMinutes && activeTaskDailyMinutes > 0
        ? activeTaskDailyMinutes * 60
        : null
      const todaySeconds = getProjectedTodaySeconds()
      const progressSeconds = todaySeconds ?? elapsed
      const percent = targetSeconds ? Math.min(100, Math.floor((progressSeconds / targetSeconds) * 100)) : null
      const progress = percent === null ? 'Progress: no daily target' : `Today: ${percent}%`
      const target = activeTaskDailyMinutes ? ` / ${minutesToLabel(activeTaskDailyMinutes)}` : ''
      const body = `${progress} · ${formatHoursMinutes(progressSeconds)}${target} logged today · Session ${formatHoursMinutes(elapsed)} elapsed`
      void showProgressNotification(name, body, trackedSession.status === 'PAUSED', trackedSession.task_id)
    }

    notify(currentElapsed)

    async function checkServerForAutoStop() {
      if (reconcileInFlightRef.current) return
      reconcileInFlightRef.current = true
      const requestVersion = sessionMutationVersionRef.current
      try {
        const s = await getActiveSession()
        if (requestVersion !== sessionMutationVersionRef.current) return
        if (s && s.auto_stop_reason) {
          const task = await getTask(s.task_id).catch(() => null)
          if (requestVersion !== sessionMutationVersionRef.current) return
          const taskName = task?.name ?? (s.task_id === trackedSession.task_id ? activeTaskName : null) ?? 'Task'
          if (s.auto_stop_reason === 'target_reached') {
            await handleTargetReached(s.id, s.task_id, taskName, task?.daily_minutes ?? (s.task_id === trackedSession.task_id ? activeTaskDailyMinutes : null))
          } else {
            clearCurrentTask()
            await showTaskCompletionNotification('Timer paused for safety', `"${taskName}" was stopped after a long unattended session.`)
          }
          return
        }
        if (!s) {
          clearCurrentTask()
          return
        }
        if (s.id !== trackedSession.id || s.status !== trackedSession.status) {
          applySession(s)
          const appliedVersion = sessionMutationVersionRef.current
          const task = await getTask(s.task_id).catch(() => null)
          if (appliedVersion !== sessionMutationVersionRef.current) return
          setActiveTaskName(task?.name ?? null)
          setActiveTaskDailyMinutes(task?.daily_minutes ?? null)
          void syncTaskDailyProgress(s.task_id)
        }
      } catch {
        // Transient network hiccup - try again on the next check.
      } finally {
        reconcileInFlightRef.current = false
      }
    }

    if (trackedSession.status === 'ACTIVE') {
      tickRef.current = window.setInterval(() => {
        const now = Date.now()
        const elapsed = elapsedBase + Math.floor((now - elapsedBaseAt) / 1000)
        setLiveElapsedSeconds(elapsed)
        if (elapsed % NOTIFICATION_RESYNC_SECONDS === 0) notify(elapsed)

        const projectedToday = getProjectedTodaySeconds()
        const targetSeconds = activeTaskDailyMinutes && activeTaskDailyMinutes > 0
          ? activeTaskDailyMinutes * 60
          : null
        const nearTarget = targetSeconds !== null && projectedToday !== null && projectedToday >= targetSeconds
        const regularReconcileDue = elapsed % SERVER_RECONCILE_SECONDS === 0
        const targetProbeDue = nearTarget && now - lastTargetProbeAtRef.current >= TARGET_PROBE_MIN_INTERVAL_MS
        if (regularReconcileDue || targetProbeDue) {
          if (targetProbeDue) lastTargetProbeAtRef.current = now
          void checkServerForAutoStop()
        }
      }, 1000)
    }

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, elapsedBase, elapsedBaseAt, activeTaskName, activeTaskDailyMinutes,
      activeTaskLoggedTodaySeconds, dailySnapshotAt, dailySnapshotDate, dailySnapshotTaskId, applySession,
      clearCurrentTask, handleTargetReached, syncTaskDailyProgress])

  // Notification actions share exactly the same pause/resume/start operations as
  // the web UI. The service worker opens a deep link when there is no live page.
  useEffect(() => {
    const unsubscribe = onNotificationAction((action, taskId) => {
      if (action === 'toggle-pause') {
        const current = activeSessionRef.current
        if (!current) return
        if (current.status === 'ACTIVE') void pause()
        else void resume()
      } else if (action === 'start-next' && taskId) {
        void startTaskById(taskId)
      }
    })
    return unsubscribe
  }, [pause, resume, startTaskById])

  // When the service worker has no existing tab, it opens the dashboard with a
  // one-shot action query. Handle it after authentication is ready, then remove
  // the query so browser refresh cannot repeat a task start/pause action.
  useEffect(() => {
    if (!authSession) return
    const params = new URLSearchParams(window.location.search)
    const action = params.get('notificationAction')
    if (action !== 'start-next' && action !== 'toggle-pause') return
    const taskId = params.get('taskId')
    const signature = `${action}:${taskId ?? ''}`
    if (handledDeepLinkRef.current.has(signature)) return
    handledDeepLinkRef.current.add(signature)

    params.delete('notificationAction')
    params.delete('taskId')
    const remainder = params.toString()
    const cleanUrl = `${window.location.pathname}${remainder ? `?${remainder}` : ''}${window.location.hash}`
    window.history.replaceState(window.history.state, '', cleanUrl)

    void (async () => {
      if (action === 'start-next' && taskId) {
        await startTaskById(taskId)
        return
      }
      if (action === 'toggle-pause') {
        try {
          const current = await getActiveSession()
          if (!current) return
          if (current.auto_stop_reason) {
            const task = await getTask(current.task_id).catch(() => null)
            if (current.auto_stop_reason === 'target_reached') {
              await handleTargetReached(current.id, current.task_id, task?.name ?? 'Task', task?.daily_minutes ?? null)
            } else {
              clearCurrentTask()
              await showTaskCompletionNotification('Timer paused for safety', `\"${task?.name ?? 'Task'}\" was stopped after a long unattended session.`)
            }
            return
          }
          const changed = current.status === 'ACTIVE'
            ? await pauseSession(current.id)
            : await resumeSession(current.id)
          applySession(changed)
          const task = await getTask(changed.task_id).catch(() => null)
          setActiveTaskName(task?.name ?? null)
          setActiveTaskDailyMinutes(task?.daily_minutes ?? null)
          void syncTaskDailyProgress(changed.task_id)
        } catch (err) {
          setError(friendlyError(err, 'Couldn’t update the timer from the notification.'))
        }
      }
    })()
  }, [authSession, applySession, clearCurrentTask, handleTargetReached, startTaskById, syncTaskDailyProgress])

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const value: ActiveSessionContextValue = {
    activeSession,
    activeTaskId: activeSession?.task_id ?? null,
    activeTaskName,
    liveElapsedSeconds,
    busy,
    error,
    celebration,
    dismissCelebration,
    start,
    pause,
    resume,
    refresh
  }

  return <ActiveSessionContext.Provider value={value}>{children}</ActiveSessionContext.Provider>
}

export function useActiveSession(): ActiveSessionContextValue {
  const ctx = useContext(ActiveSessionContext)
  if (!ctx) throw new Error('useActiveSession must be used within an ActiveSessionProvider')
  return ctx
}
