import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getTripById } from '@/lib/vendo'
import { fetchPolyline } from '@/lib/hafas'

interface LegRecord {
  id: string
  tripIdVendo: string | null
  originIbnr: string | null
  trainNumber: string | null
  plannedDeparture: Date
  polyline: unknown
}

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/trips/[id]/polylines
 *
 * Fetches and persists polylines for all legs in the trip that don't have one yet.
 * Called lazily from the trip detail page — always returns 200.
 *
 * Strategy (in order of preference per leg):
 *   1. tripIdVendo is set → call getTripById() directly (fast, no board scan)
 *   2. originIbnr + trainNumber → departure board scan via fetchPolyline()
 *
 * Response: { data: { updated: number } }> }
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const trip = await prisma().trip.findUnique({
    where: { id, userId: user.id },
    include: { legs: { orderBy: { position: 'asc' } } },
  })
  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legs: LegRecord[] = (trip as any).legs ?? []

  const legsToEnrich = legs.filter(
    (leg) => !leg.polyline && (leg.tripIdVendo || (leg.originIbnr && leg.trainNumber)),
  )

  console.log(
    `[polylines] trip=${id} total=${legs.length} to_enrich=${legsToEnrich.length}`,
    legsToEnrich.map((l: any) => ({ id: l.id, tripIdVendo: l.tripIdVendo, originIbnr: l.originIbnr })),
  )

  let updated = 0

  await Promise.allSettled(
    legsToEnrich.map(async (leg: any) => {
      let coords: [number, number][] | null = null

      if (leg.tripIdVendo) {
        // Fast path: tripId already known — skip the departure board scan entirely
        try {
          const trip = await getTripById(leg.tripIdVendo)
          const raw = trip?.polyline?.coordinates
          if (raw && raw.length >= 2) coords = raw
        } catch {
          // fall through to departure board fallback
        }
      }

      if (!coords && leg.originIbnr && leg.trainNumber) {
        // Slow path: re-discover tripId via departure board, then fetch polyline
        coords = await fetchPolyline(
          leg.originIbnr,
          leg.plannedDeparture,
          leg.trainNumber,
        )
      }

      if (!coords) return

      await prisma().leg.update({
        where: { id: leg.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { polyline: coords as any },
      })
      updated++
    }),
  )

  console.log(`[polylines] trip=${id} updated=${updated}`)
  return NextResponse.json({ data: { updated } })
}
