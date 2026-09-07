import fs from 'node:fs'
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const dashboard = read('src/pages/DashboardPage.tsx')
const notifications = read('src/lib/notifications.ts')
const worker = read('public/service-worker.js')
const history = read('src/lib/historyApi.ts')
for (const token of ['dailyCompleted', 'remaining_seconds', 'showTaskCompletionNotification', 'onNotificationAction']) {
  if (!(dashboard.includes(token) || notifications.includes(token))) throw new Error(`missing ${token}`)
}
if (!worker.includes('NOTIFICATION_ACTION') || !worker.includes('notificationAction=')) throw new Error('closed notification action contract missing')
if (!history.includes('/api/v1/history/summary')) throw new Error('history summary API client missing')
console.log('P24 frontend contract: PASS')
