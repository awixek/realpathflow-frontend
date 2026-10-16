let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null)
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.error('Service worker registration failed', err)
      return null
    })
  }
  return registrationPromise
}

async function getActiveWorker(): Promise<ServiceWorker | null> {
  const registration = await registerServiceWorker()
  if (!registration) return null
  try {
    const ready = await navigator.serviceWorker.ready
    return ready.active ?? registration.active ?? registration.waiting ?? registration.installing
  } catch {
    return registration.active ?? registration.waiting ?? registration.installing
  }
}

/** Must be called from a user gesture (e.g. a click handler) - browsers block silent permission prompts. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function showProgressNotification(
  title: string,
  body: string,
  isPaused: boolean,
  taskId?: string
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const worker = await getActiveWorker()
  worker?.postMessage({
    type: 'SHOW_PROGRESS_NOTIFICATION',
    payload: { title, body, isPaused, taskId }
  })
}

export interface NextTaskNotificationAction {
  id: string
  name: string
}

export async function showTaskCompletionNotification(
  title: string,
  body: string,
  nextTask?: NextTaskNotificationAction
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const worker = await getActiveWorker()
  worker?.postMessage({
    type: 'SHOW_COMPLETION_NOTIFICATION',
    payload: {
      title,
      body,
      nextTaskId: nextTask?.id,
      nextTaskName: nextTask?.name
    }
  })
}

export async function closeProgressNotification() {
  const worker = await getActiveWorker()
  worker?.postMessage({ type: 'CLOSE_PROGRESS_NOTIFICATION' })
}

export type NotificationAction = 'toggle-pause' | 'show-progress' | 'start-next'

/** Fires when a notification action is clicked in a currently open app tab. */
export function onNotificationAction(handler: (action: NotificationAction, taskId?: string) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  const listener = (event: MessageEvent) => {
    if (event.data?.type === 'NOTIFICATION_ACTION') {
      handler(event.data.action, event.data.taskId)
    }
  }
  navigator.serviceWorker.addEventListener('message', listener)
  return () => navigator.serviceWorker.removeEventListener('message', listener)
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function subscribeToPush(publicKey: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const registration = await registerServiceWorker()
  if (!registration) return null
  const permissionGranted = await requestNotificationPermission()
  if (!permissionGranted) return null
  const ready = await navigator.serviceWorker.ready
  const existing = await ready.pushManager.getSubscription()
  if (existing) return existing
  return ready.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
  })
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const registration = await registerServiceWorker()
  if (!registration) return null
  const ready = await navigator.serviceWorker.ready
  return ready.pushManager.getSubscription()
}
