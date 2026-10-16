// Minimal service worker for active-task timer controls and user-requested push reminders.
// Timer data remains server-authoritative; this worker only presents actions and relays clicks.

const ACTIVE_TASK_TAG = 'realpathflow-active-task'
const COMPLETION_TAG = 'realpathflow-task-complete'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg) return

  if (msg.type === 'SHOW_PROGRESS_NOTIFICATION') {
    const { title, body, isPaused, taskId } = msg.payload || {}
    event.waitUntil(self.registration.showNotification(title || 'RealPathFlow', {
      body: body || 'Your task timer is active.',
      tag: ACTIVE_TASK_TAG,
      renotify: false,
      silent: true,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      actions: [
        { action: 'toggle-pause', title: isPaused ? '▶ Resume' : '⏸ Pause' },
        { action: 'show-progress', title: 'Progress' }
      ],
      data: { isPaused: Boolean(isPaused), taskId: taskId || null, url: '/' }
    }))
  }

  if (msg.type === 'SHOW_COMPLETION_NOTIFICATION') {
    const { title, body, nextTaskId, nextTaskName } = msg.payload || {}
    const actions = nextTaskId
      ? [
          { action: 'start-next', title: `▶ Start ${nextTaskName || 'next task'}` },
          { action: 'show-progress', title: 'Progress' }
        ]
      : [{ action: 'show-progress', title: 'Progress' }]
    event.waitUntil(self.registration.showNotification(title || 'Task complete 🎉', {
      body: body || 'Your daily target is complete.',
      tag: COMPLETION_TAG,
      renotify: true,
      silent: false,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      actions,
      data: { nextTaskId: nextTaskId || null, nextTaskName: nextTaskName || null, url: '/' }
    }))
  }

  if (msg.type === 'CLOSE_PROGRESS_NOTIFICATION') {
    event.waitUntil(self.registration.getNotifications({ tag: ACTIVE_TASK_TAG }).then((items) => {
      items.forEach((notification) => notification.close())
    }))
  }
})

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const action = event.action // '' if the notification body was tapped
  const data = notification.data || {}
  notification.close()

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    if (action === 'toggle-pause') {
      if (clients.length > 0) {
        await clients[0].focus()
        clients[0].postMessage({ type: 'NOTIFICATION_ACTION', action: 'toggle-pause' })
        return
      }
      await self.clients.openWindow('/?notificationAction=toggle-pause')
      return
    }

    if (action === 'start-next') {
      const taskId = data.nextTaskId
      if (!taskId) {
        if (clients.length > 0) return clients[0].focus()
        return self.clients.openWindow('/')
      }
      const url = `/?notificationAction=start-next&taskId=${encodeURIComponent(taskId)}`
      if (clients.length > 0) {
        const client = clients[0]
        const navigated = typeof client.navigate === 'function' ? await client.navigate(url) : client
        return (navigated || client).focus()
      }
      return self.clients.openWindow(url)
    }

    // Progress or body click opens the dashboard with the most current timer state.
    if (clients.length > 0) {
      const client = clients[0]
      const navigated = typeof client.navigate === 'function' ? await client.navigate('/') : client
      return (navigated || client).focus()
    }
    return self.clients.openWindow('/')
  })())
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
    renotify: false,
    silent: false,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' }
  }))
})
