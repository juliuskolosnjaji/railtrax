import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = prisma()

  try {
    // Cancel active Lemon Squeezy subscription if present
    const activeSub = await db.subscription.findFirst({
      where: { userId: user.id, status: 'active' },
    })

    if (activeSub?.lsSubscriptionId) {
      // Subscription billing system removed — subscription will remain in billing system
    }

    // Delete all user data in FK-safe order
    await db.$transaction([
      // Journal photos cascade from JournalEntry — explicit for safety
      db.journalPhoto.deleteMany({
        where: { entry: { userId: user.id } },
      }),
      db.journalEntry.deleteMany({ where: { userId: user.id } }),
      // LegRollingStock cascades from Leg — explicit for safety
      db.legRollingStock.deleteMany({
        where: { leg: { trip: { userId: user.id } } },
      }),
      db.leg.deleteMany({
        where: { trip: { userId: user.id } },
      }),
      db.trip.deleteMany({ where: { userId: user.id } }),
      db.ticket.deleteMany({ where: { userId: user.id } }),
      db.routeReview.deleteMany({ where: { userId: user.id } }),
      db.apiKey.deleteMany({ where: { userId: user.id } }),
      db.customRoute.deleteMany({ where: { userId: user.id } }),
      db.interrailPass.deleteMany({ where: { userId: user.id } }),
      db.userAchievement.deleteMany({ where: { userId: user.id } }),
      // These have onDelete: Cascade but we delete explicitly to be safe
      db.pushSubscription.deleteMany({ where: { userId: user.id } }),
      db.subscription.deleteMany({ where: { userId: user.id } }),
      db.usageCounter.deleteMany({ where: { userId: user.id } }),
      db.user.delete({ where: { id: user.id } }),
    ])

    // Remove uploaded files from Supabase Storage
    const adminClient = createAdminClient()
    try {
      const { data: ticketFiles } = await adminClient.storage
        .from('tickets')
        .list(user.id)
      if (ticketFiles && ticketFiles.length > 0) {
        await adminClient.storage
          .from('tickets')
          .remove(ticketFiles.map((f) => `${user.id}/${f.name}`))
      }
    } catch (e) {
      console.error('[delete-account] Could not remove storage files:', e)
    }

    // Delete Supabase Auth user last (uses service role)
    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id)
    if (authError) {
      console.error('[delete-account] Could not delete auth user:', authError.message)
      // Data is already deleted — proceed
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[delete-account] Unexpected error:', e)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
