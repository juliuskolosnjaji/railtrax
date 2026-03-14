import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPlan, can } from '@/lib/entitlements'
import { createJournalEntrySchema } from '@/lib/validators/journal'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tripId = req.nextUrl.searchParams.get('tripId')
  if (!tripId) return NextResponse.json({ error: 'validation_error', details: 'tripId required' }, { status: 422 })

  // Verify trip ownership
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { userId: true } })
  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (trip.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const entries = await prisma.journalEntry.findMany({
    where: { tripId, userId: user.id },
    include: { photos: { orderBy: { position: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ data: entries })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const plan = getPlan(user.app_metadata as { plan?: string })
  if (!can(plan, 'journal')) {
    return NextResponse.json({ error: 'upgrade_required', requiredPlan: 'plus' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createJournalEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 422 })
  }

  // Verify trip ownership
  const trip = await prisma.trip.findUnique({ where: { id: parsed.data.trip_id }, select: { userId: true } })
  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (trip.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Optionally verify leg belongs to trip
  if (parsed.data.leg_id) {
    const leg = await prisma.leg.findUnique({ where: { id: parsed.data.leg_id }, select: { tripId: true } })
    if (!leg || leg.tripId !== parsed.data.trip_id) {
      return NextResponse.json({ error: 'validation_error', details: 'leg not in trip' }, { status: 422 })
    }
  }

  try {
    const entry = await prisma.journalEntry.create({
      data: {
        tripId: parsed.data.trip_id,
        legId: parsed.data.leg_id ?? null,
        userId: user.id,
        body: parsed.data.body ? JSON.stringify(parsed.data.body) : null,
        mood: parsed.data.mood ?? null,
        locationName: parsed.data.location_name ?? null,
        lat: parsed.data.lat ?? null,
        lon: parsed.data.lon ?? null,
      },
      include: { photos: true },
    })
    return NextResponse.json({ data: entry }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
