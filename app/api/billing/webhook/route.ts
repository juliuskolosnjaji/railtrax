import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Map Lemon Squeezy variant IDs → plan names
const VARIANT_TO_PLAN: Record<string, 'plus' | 'pro'> = {
  [process.env.LS_VARIANT_PLUS_MONTHLY!]: 'plus',
  [process.env.LS_VARIANT_PLUS_YEARLY!]: 'plus',
  [process.env.LS_VARIANT_PRO_MONTHLY!]: 'pro',
  [process.env.LS_VARIANT_PRO_YEARLY!]: 'pro',
}

function verifySignature(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
  const digest = hmac.update(body).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const eventName = (event.meta as Record<string, unknown>)?.event_name as string
  const data = event.data as Record<string, unknown>
  const attrs = data?.attributes as Record<string, unknown>
  const userId = ((event.meta as Record<string, unknown>)?.custom_data as Record<string, unknown>)?.user_id as string

  if (!userId) {
    // Ignore events without a user_id (shouldn't happen with our checkout setup)
    return NextResponse.json({ received: true })
  }

  const supabase = createAdminClient()

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated':
    case 'subscription_resumed': {
      const plan = VARIANT_TO_PLAN[String(attrs.variant_id)] ?? 'free'
      const isYearly = String(attrs.variant_name ?? '').toLowerCase().includes('yearly')

      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          ls_subscription_id: String(data.id),
          ls_customer_id: String(attrs.customer_id),
          ls_variant_id: String(attrs.variant_id),
          ls_order_id: String(attrs.order_id),
          plan,
          status: attrs.status,
          billing_interval: isYearly ? 'yearly' : 'monthly',
          current_period_start: attrs.created_at
            ? new Date(attrs.created_at as string).toISOString()
            : null,
          current_period_end: attrs.renews_at ?? null,
          cancel_at_period_end: attrs.cancelled ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'ls_subscription_id' },
      )

      // Update JWT claims so plan checks are zero-latency
      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { plan },
      })
      break
    }

    case 'subscription_cancelled': {
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('ls_subscription_id', String(data.id))
      break
    }

    case 'subscription_expired': {
      await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          plan: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('ls_subscription_id', String(data.id))

      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { plan: 'free' },
      })
      break
    }

    case 'subscription_payment_failed': {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('ls_subscription_id', String(data.id))
      break
    }
  }

  return NextResponse.json({ received: true })
}

// Note: App Router route handlers have no automatic body parsing,
// so req.text() already returns the raw body. No config needed.
