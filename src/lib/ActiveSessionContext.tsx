import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import {
  getActiveSession,
  getTask,
  pauseSession,
  resumeSession,
  startSession
} from './tasksApi'
import { friendlyError } from './errorMessages'
import {
  closeProgressNotification,
  onNotificationAction,
  requestNotificationPermission,
  showProgressNotification,
  showTaskCompletionNotification
} from './notifications'
import { playSubtaskChime } from './sound'
import { formatClock, minutesToLabel } from './time'
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
  /** Set briefly when the server auto-stops a session because that task's
   * own daily target was reached - the UI shows a congratulatory toast
   * while this is non-null, then it self-clears. */
  celebration: Celebration | null
  dismissCelebration: () => void
  /** Call after starting a session from a page that already has the full Task object (avoids an extra fetch). */
  start: (task: Task) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  /** Re-pulls the active session from the server - useful after task list changes elsewhere. */
  refresh: () => Promise<void>
}

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null)

const NOTIFICATION_RESYNC_SECONDS = 15

export function ActiveSessionProvider({ children }: { children: ReactNode }) {
  const { session: authSession } = useAuth()

  const [activeSession, setActiveSession] = useState<TaskSession | null>(null)
  const [activeTaskName, setActiveTaskName] = useState<string | null>(null)
  const [activeTaskDailyMinutes, setActiveTaskDailyMinutes] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const dismissCelebration = useCallback(() => setCelebration(null), [])

  const [elapsedBase, setElapsedBase] = useState(0)
  const [elapsedBaseAt, setElapsedBaseAt] = useState(Date.now())
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0)

  const tickRef = useRef<number | null>(null)
  const activeSessionRef = useRef<TaskSession | null>(null)
  useEffect(() => {
    activeSessionRef.current = activeSession
  }, [activeSession])

  const applySession = useCallback((s: TaskSession | null) => {
    setActiveSession(s)
    setElapsedBase(s?.elapsed_seconds ?? 0)
    setElapsedBaseAt(Date.now())
  }, [])

  const notify = useCallback(
    (s: TaskSession, taskName: string | null, dailyMinutes: number | null, elapsed: number) => {
      const name = taskName ?? 'Task'
      const target = dailyMinutes ? ` · target ${minutesToLabel(dailyMinutes)}/day` : ''
      showProgressNotification(name, `${formatClock(elapsed)} elapsed${target}`, s.status === 'PAUSED')
    },
    []
  )

  // Restore an in-progress session on load (page refresh, or opening a new
  // tab while a timer is already running) whenever we have an authenticated
  // user. Signing out clears everything and closes the notification.
  const refresh = useCallback(async () => {
    if (!authSession) {
      applySession(null)
      setActiveTaskName(null)
      setActiveTaskDailyMinutes(null)
      return
    }
    try {
      const s = await getActiveSession()
      if (s && s.auto_stop_reason) {
        // Target was reached, or the timer went stale, while nobody had
        // the app open to see it tick over - still worth telling them.
        const task = await getTask(s.task_id).catch(() => null)
        const taskName = task?.name ?? 'Task'
        if (s.auto_stop_reason === 'target_reached') {
          setCelebration({ taskName })
        }
        applySession(null)
        setActiveTaskName(null)
        setActiveTaskDailyMinutes(null)
        return
      }
      applySession(s)
      if (s) {
        const task = await getTask(s.task_id).catch(() => null)
        setActiveTaskName(task?.name ?? null)
        setActiveTaskDailyMinutes(task?.daily_minutes ?? null)
      } else {
        setActiveTaskName(null)
        setActiveTaskDailyMinutes(null)
      }
    } catch {
      // Not fatal - the person just won't see a restored timer this load.
    }
  }, [authSession, applySession])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The single ticking clock: advances liveElapsedSeconds every second while
  // ACTIVE, and re-syncs the OS notification periodically so its elapsed
  // time keeps moving even while the person is on a different page (Profile,
  // etc.) - not just while the Today page happens to be mounted.
  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current)

    if (!activeSession || activeSession.status === 'COMPLETED') {
      setLiveElapsedSeconds(0)
      closeProgressNotification()
      return
    }

    const currentElapsed =
      activeSession.status === 'ACTIVE'
        ? elapsedBase + Math.floor((Date.now() - elapsedBaseAt) / 1000)
        : elapsedBase
    setLiveElapsedSeconds(currentElapsed)
    notify(activeSession, activeTaskName, activeTaskDailyMinutes, currentElapsed)

    // Re-asks the server "is this session still supposed to be running?"
    // on the same cadence as the notification resync. The server is the
    // one place that knows about a target-reached or stale-timeout
    // auto-stop (app/core/task_session_service.py) - a client-only timer
    // would never notice either on its own, especially while this tab
    // isn't the one driving the UI (another device, or just backgrounded).
    async function checkServerForAutoStop() {
      try {
        const s = await getActiveSession()
        if (s && s.auto_stop_reason) {
          const taskName = activeTaskName ?? 'Task'
          if (s.auto_stop_reason === 'target_reached') {
            playSubtaskChime()
            setCelebration({ taskName })
            showTaskCompletionNotification('Target complete 🎉', `"${taskName}" hit today's target.`)
          } else {
            showTaskCompletionNotification(
              'Timer stopped',
              `"${taskName}" had been running for a long time, so we paused it.`
            )
          }
          applySession(null)
          setActiveTaskName(null)
          setActiveTaskDailyMinutes(null)
        } else if (!s) {
          // Ended from elsewhere (another tab/device, or deleted mid-run).
          applySession(null)
          setActiveTaskName(null)
          setActiveTaskDailyMinutes(null)
        } else if (activeSession && s.id !== activeSession.id) {
          // Another tab/device switched or paused a task. Reconcile this timer
          // with the server rather than letting the old client clock drift.
          const task = await getTask(s.task_id).catch(() => null)
          applySession(s)
          setActiveTaskName(task?.name ?? null)
          setActiveTaskDailyMinutes(task?.daily_minutes ?? null)
        }
      } catch {
        // Transient network hiccup - try again on the next resync tick.
      }
    }

    if (activeSession.status === 'ACTIVE') {
      tickRef.current = window.setInterval(() => {
        const elapsed = elapsedBase + Math.floor((Date.now() - elapsedBaseAt) / 1000)
        setLiveElapsedSeconds(elapsed)
        if (elapsed % NOTIFICATION_RESYNC_SECONDS === 0) {
          notify(activeSession, activeTaskName, activeTaskDailyMinutes, elapsed)
          void checkServerForAutoStop()
        }
      }, 1000)
    }

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, elapsedBase, elapsedBaseAt, activeTaskName, activeTaskDailyMinutes, applySession])

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

  const start = useCallback(
    async (task: Task) => {
      await requestNotificationPermission()
      await withBusy(async () => {
        const s = await startSession(task.id)
        if (s.status === 'COMPLETED' || s.auto_stop_reason) {
          if (s.auto_stop_reason === 'target_reached') setCelebration({ taskName: task.name })
          applySession(null)
          setActiveTaskName(null)
          setActiveTaskDailyMinutes(null)
          return
        }
        applySession(s)
        setActiveTaskName(task.name)
        setActiveTaskDailyMinutes(task.daily_minutes)
      })
    },
    [applySession]
  )

  const pause = useCallback(async () => {
    const current = activeSessionRef.current
    if (!current) return
    await withBusy(async () => {
      const s = await pauseSession(current.id)
      applySession(s)
    })
  }, [applySession])

  const resume = useCallback(async () => {
    const current = activeSessionRef.current
    if (!current) return
    await withBusy(async () => {
      const s = await resumeSession(current.id)
      applySession(s)
    })
  }, [applySession])

  // Let the notification's Pause/Resume action drive the same timer state
  // as the in-app control without introducing a separate stop/complete action.
  useEffect(() => {
    const unsubscribe = onNotificationAction((action) => {
      if (!activeSessionRef.current) return
      if (action === 'toggle-pause') {
        if (activeSessionRef.current.status === 'ACTIVE') pause()
        else resume()
      }
    })
    return unsubscribe
  }, [pause, resume])

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
