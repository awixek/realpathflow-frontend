import { apiJson } from './api'
import { getPushSubscription, subscribeToPush } from './notifications'

export type PushConfig = { enabled: boolean; public_key: string | null }

export async function getPushConfig(): Promise<PushConfig> {
  return apiJson<PushConfig>('/api/v1/notifications/config')
}

export async function enablePushNotifications(publicKey: string): Promise<void> {
  const subscription = await subscribeToPush(publicKey)
  if (!subscription) throw new Error('Push notifications are not supported or permission was denied.')
  await apiJson('/api/v1/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON()),
  })
}

export async function disablePushNotifications(): Promise<void> {
  const subscription = await getPushSubscription()
  if (!subscription) return
  await apiJson(`/api/v1/notifications/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
    method: 'DELETE',
  })
  await subscription.unsubscribe()
}
