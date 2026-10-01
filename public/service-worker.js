// Minimal service worker: no offline caching, just powers the
// active-task notification and its action buttons (Pause/Resume,
// Complete step). Everything about the task itself lives in the page;
// this worker only shows/updates the notification and relays clicks.

const TAG = 'realpathflow-active-task'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg) return

  if (msg.type === 'SHOW_PROGRESS_NOTIFICATION') {
    const { title, body, isPaused } = msg.payload
    self.registration.showNotification(title, {
      body,
      tag: TAG,
      renotify: false,
      silent: true,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      actions: [
        { action: 'toggle-pause', title: isPaused ? '▶ Resume' : '⏸ Pause' },
        { action: 'complete-session', title: '■ Stop' }
      ],
      data: { isPaused }
    })
  }

  if (msg.type === 'SHOW_COMPLETION_NOTIFICATION') {
    const { title, body } = msg.payload
    self.registration.showNotification(title, {
      body,
      tag: 'realpathflow-task-complete',
      renotify: true,
      silent: false,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png'
    })
  }

  if (msg.type === 'CLOSE_PROGRESS_NOTIFICATION') {
    self.registration.getNotifications({ tag: TAG }).then((list) => list.forEach((n) => n.close()))
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const action = event.action // '' if the body was tapped, not a button

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (action === 'toggle-pause' || action === 'complete-session') {
        clients.forEach((client) => client.postMessage({ type: 'NOTIFICATION_ACTION', action }))
        return
      }
      // Tapped the notification body (no action): just bring the app to front.
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow('/?notificationAction=' + encodeURIComponent(action || 'open'))
    })
  )
})

// Real Web Push delivery. The server sends a standard push payload; the
// service worker displays it even when the app is closed.
self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch (_) {}
  const title = payload.title || 'RealPathFlow reminder'
  const body = payload.body || 'You have a task waiting for you today.'
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: payload.tag || 'realpathflow-reminder',
    renotify: true,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
  }))
})
