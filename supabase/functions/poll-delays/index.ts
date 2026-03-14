import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

interface Departure {
  tripId: string
  trainNumber: string
  lineName: string
  direction: string
  plannedWhen: string
  actualWhen: string | null
  delayMinutes: number
  plannedPlatform: string | null
  actualPlatform: string | null
  cancelled: boolean
}

async function getDepartures(ibnr: string, when: Date): Promise<Departure[]> {
  const { createClient } = await import('https://esm.sh/db-vendo-client@1')
  const { profile: dbnavProfile } = await import('https://esm.sh/db-vendo-client/p/dbnav/index.js')
  
  const client = createClient(dbnavProfile, 'railtrax-poll-delays/1.0')
  
  const { departures } = await client.departures(ibnr, {
    when,
    duration: 90,
    results: 30,
  })
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (departures as any[]).map((d: any): Departure => ({
    tripId: d.tripId ?? '',
    trainNumber: d.line?.name ?? '',
    lineName: d.line?.name ?? '',
    direction: d.direction ?? '',
    plannedWhen: d.plannedWhen ?? d.when ?? '',
    actualWhen: d.when ?? null,
    delayMinutes: Math.round((d.delay ?? 0) / 60),
    plannedPlatform: d.plannedPlatform ?? null,
    actualPlatform: d.platform ?? null,
    cancelled: d.cancelled ?? false,
  }))
}

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions?.length) return

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

  const webpush = await import('https://esm.sh/web-push@3.11.0')
  webpush.setVapidDetails(
    'mailto:support@railplanner.app',
    vapidPublicKey,
    vapidPrivateKey
  )

  const payload = JSON.stringify({ title, body, url, icon: '/icon-192.png' })

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    } catch (err) {
      const error = err as { statusCode?: number }
      if (error.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }
}

Deno.serve(async () => {
  const now = new Date()
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const { data: legs, error } = await supabase
    .from('legs')
    .select(`
      id,
      trip_id,
      status,
      planned_departure,
      origin_ibnr,
      train_number,
      delay_minutes,
      platform_actual,
      trips!inner(user_id)
    `)
    .in('status', ['planned', 'checked_in'])
    .gte('planned_departure', now.toISOString())
    .lte('planned_departure', twoHoursLater.toISOString())
    .limit(100)

  if (error || !legs?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let processed = 0

  for (const leg of legs) {
    if (!leg.origin_ibnr || !leg.train_number) continue

    try {
      const departures = await getDepartures(leg.origin_ibnr, new Date(leg.planned_departure))
      
      const normalizedTrain = leg.train_number.replace(/\s+/g, '').toLowerCase()
      const match = departures.find(
        (d) => d.trainNumber.replace(/\s+/g, '').toLowerCase() === normalizedTrain
      )

      if (!match) continue

      const userId = (leg.trips as { user_id: string }[])[0]?.user_id
      if (!userId) continue

      const updates: Record<string, unknown> = {}
      let notificationType: string | null = null

      if (match.delayMinutes !== leg.delay_minutes && Math.abs(match.delayMinutes - leg.delay_minutes) >= 2) {
        updates.delay_minutes = match.delayMinutes
        notificationType = 'delay'
      }

      if (match.actualPlatform && match.actualPlatform !== leg.platform_actual) {
        updates.platform_actual = match.actualPlatform
        notificationType = 'platform'
      }

      if (match.cancelled) {
        updates.status = 'cancelled'
        updates.cancelled = true
        notificationType = 'cancelled'
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('legs').update(updates).eq('id', leg.id)

        if (notificationType) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('delay_alerts, platform_changes, cancellations')
            .eq('user_id', userId)
            .single()

          const shouldNotify =
            (notificationType === 'delay' && prefs?.delay_alerts !== false) ||
            (notificationType === 'platform' && prefs?.platform_changes !== false) ||
            (notificationType === 'cancelled' && prefs?.cancellations !== false)

          if (shouldNotify && prefs?.delay_alerts !== false) {
            let title = ''
            let body = ''

            if (notificationType === 'delay') {
              title = `Delay: ${leg.train_number}`
              body = match.delayMinutes > 0
                ? `Running ${match.delayMinutes} min late`
                : 'Back on time'
            } else if (notificationType === 'platform') {
              title = `Platform change: ${leg.train_number}`
              body = `Now departing from platform ${match.actualPlatform}`
            } else if (notificationType === 'cancelled') {
              title = `Cancelled: ${leg.train_number}`
              body = 'This train has been cancelled'
            }

            if (title) {
              await sendPushNotification(
                userId,
                title,
                body,
                `/trips/${leg.trip_id}`
              )
            }
          }
        }
      }

      processed++
    } catch {
      // Skip this leg on error
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
