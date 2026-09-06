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

/** Must be called from a user gesture (e.g. a click handler) - browsers block silent permission prompts. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function showProgressNotification(title: string, body: string, isPaused: boolean) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const registration = await registerServiceWorker()
  registration?.active?.postMessage({ type: 'SHOW_PROGRESS_NOTIFICATION', payload: { title, body, isPaused } })
}

export async function closeProgressNotification() {
  const registration = await registerServiceWorker()
  registration?.active?.postMessage({ type: 'CLOSE_PROGRESS_NOTIFICATION' })
}

export type NotificationAction = 'toggle-pause' | 'complete-step'

/** Fires when the person taps an action button on the notification. Returns an unsubscribe function. */
export function onNotificationAction(handler: (action: NotificationAction) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  const listener = (event: MessageEvent) => {
    if (event.data?.type === 'NOTIFICATION_ACTION') {
      handler(event.data.action)
    }
  }
  navigator.serviceWorker.addEventListener('message', listener)
  return () => navigator.serviceWorker.removeEventListener('message', listener)
}
