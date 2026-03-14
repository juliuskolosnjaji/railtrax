import webpush from 'web-push'
import { prisma } from './prisma'

let vapidInitialized = false

function ensureVapidInitialized() {
  if (!vapidInitialized) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured')
    }
    webpush.setVapidDetails(
      'mailto:support@railplanner.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    vapidInitialized = true
  }
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<void> {
  ensureVapidInitialized()
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  )
}

export async function sendToUser(
  userId: string,
  notification: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  })

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendToSubscription(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notification
      )
    )
  )

  let sent = 0
  let failed = 0

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      sent++
    } else {
      const error = result.reason as { statusCode?: number }
      if (error.statusCode === 410) {
        await prisma.pushSubscription.delete({
          where: { endpoint: subscriptions[i].endpoint },
        })
      }
      failed++
    }
  }

  return { sent, failed }
}

export function getVapidPublicKey(): string {
  if (!process.env.VAPID_PUBLIC_KEY) {
    throw new Error('VAPID_PUBLIC_KEY not configured')
  }
  return process.env.VAPID_PUBLIC_KEY
}
