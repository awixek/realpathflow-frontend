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
        { action: 'complete-step', title: '✓ Complete step' }
      ],
      data: { isPaused }
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
      if (action === 'toggle-pause' || action === 'complete-step') {
        clients.forEach((client) => client.postMessage({ type: 'NOTIFICATION_ACTION', action }))
        return
      }
      // Tapped the notification body (no action): just bring the app to front.
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
