import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPlan, getLimit } from '@/lib/entitlements'
import { createLegSchema } from '@/lib/validators/leg'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createLegSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // Verify the trip belongs to this user
  const trip = await prisma().trip.findUnique({
    where: { id: parsed.data.tripId, userId: user.id },
  })
  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Check per-trip leg limit
  const plan = getPlan(user.app_metadata as { plan?: string })
  const maxLegs = getLimit(plan, 'maxLegsPerTrip')

  if (maxLegs !== Infinity) {
    const legCount = await prisma().leg.count({ where: { tripId: parsed.data.tripId } })
    if (legCount >= maxLegs) {
      return NextResponse.json(
        { error: 'limit_reached', limit: maxLegs, current: legCount, upgrade: true },
        { status: 403 },
      )
    }
  }

  // Auto-assign position = current max + 1
  const lastLeg = await prisma().leg.findFirst({
    where: { tripId: parsed.data.tripId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const position = (lastLeg?.position ?? -1) + 1

  // Calculate distance using Haversine formula
  let distanceKm: number | null = null
  if (parsed.data.originLat && parsed.data.originLon && parsed.data.destLat && parsed.data.destLon) {
    distanceKm = Math.round(haversineKm(
      parsed.data.originLat,
      parsed.data.originLon,
      parsed.data.destLat,
      parsed.data.destLon
    ) * 10) / 10
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leg = await (prisma().leg.create as any)({
      data: {
        tripId: parsed.data.tripId,
        position,
        originName: parsed.data.originName,
        originIbnr: parsed.data.originIbnr,
        originLat: parsed.data.originLat,
        originLon: parsed.data.originLon,
        plannedDeparture: new Date(parsed.data.plannedDeparture),
        destName: parsed.data.destName,
        destIbnr: parsed.data.destIbnr,
        destLat: parsed.data.destLat,
        destLon: parsed.data.destLon,
        plannedArrival: new Date(parsed.data.plannedArrival),
        operator: parsed.data.operator,
        trainNumber: parsed.data.trainNumber,
        trainType: parsed.data.trainType,
        lineName: parsed.data.lineName,
        tripIdVendo: parsed.data.tripIdVendo,
        seat: parsed.data.seat,
        notes: parsed.data.notes,
        status: 'planned',
        distanceKm: distanceKm,
      },
    })
    return NextResponse.json({ data: leg }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
