import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getDepartures } from '@/lib/vendo'

interface LegRecord {
  id: string
  originIbnr: string | null
  destIbnr: string | null
  trainNumber: string | null
  plannedDeparture: Date
  plannedArrival: Date
  platformPlanned: string | null
  platformActual: string | null
  arrivalPlatformPlanned: string | null
  arrivalPlatformActual: string | null
}

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/trips/[id]/platforms
 *
 * Fetches platform information from the DB Vendo API for legs missing it
 * and writes the data to the database. Called lazily from the trip detail
 * page alongside the polylines endpoint — always returns 200.
 *
 * For each eligible leg (has originIbnr + trainNumber + plannedDeparture):
 *   1. Query departures endpoint to find matching train
 *   2. Extract both departure and arrival platform from the full trip
 *
 * Response: { data: { updated: number } }
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
    (leg) => {
      if (!leg.originIbnr || !leg.trainNumber) return false
      // Skip if all 4 platform fields are already populated
      if (
        leg.platformPlanned && leg.platformActual &&
        leg.arrivalPlatformPlanned && leg.arrivalPlatformActual
      ) return false
      return true
    },
  )

  if (legsToEnrich.length === 0) {
    return NextResponse.json({ data: { updated: 0 } })
  }

  console.log(
    `[platforms] trip=${id} total=${legs.length} to_enrich=${legsToEnrich.length}`,
  )

  let updated = 0

  await Promise.allSettled(
    legsToEnrich.map(async (leg: any) => {
      try {
        // Query the departure board to find the matching train
        const departures = await getDepartures(
          leg.originIbnr,
          new Date(leg.plannedDeparture),
          30, // search 30 minutes of departures
        )

        const normalised = leg.trainNumber.replace(/\s+/g, '').toLowerCase()
        const match = departures.find((dep) => {
          if (dep.cancelled) return false
          const depNormalised = dep.lineName.replace(/\s+/g, '').toLowerCase()
          return depNormalised === normalised
        })

        if (!match) {
          console.log(`[platforms] leg=${leg.id} train=${leg.trainNumber} not found at ${leg.originIbnr}`)
          return
        }

        // If the departure has a tripId, fetch the full trip to get arrival platform
        const departurePlatform = match.actualPlatform ?? match.plannedPlatform ?? null

        let arrivalPlatform: string | null = null
        if (match.tripId && leg.destIbnr) {
          const { getTripById } = await import('@/lib/vendo')
          const fullTrip = await getTripById(match.tripId)
          if (fullTrip) {
            // Find the stop matching the destination IBNR
            const arrivalStop = fullTrip.stops.find(
              (s) => s.ibnr === leg.destIbnr,
            )
            if (arrivalStop?.platform) {
              arrivalPlatform = arrivalStop
            }
          }
        }

        const needsUpdate =
          (departurePlatform !== leg.platformActual) ||
          (match.plannedPlatform !== leg.platformPlanned) ||
          (arrivalPlatform && arrivalPlatform !== leg.arrivalPlatformActual)

        if (!needsUpdate) return

        await prisma().leg.update({
          where: { id: leg.id },
          data: {
            platformActual: departurePlatform,
            platformPlanned: match.plannedPlatform,
            ...(arrivalPlatform && {
              arrivalPlatformActual: arrivalPlatform,
              arrivalPlatformPlanned: arrivalPlatform,
            }),
          },
        })

        console.log(
          `[platforms] leg=${leg.id} dep=${departurePlatform ?? match.plannedPlatform ?? '-'} arr=${arrivalPlatform ?? '-'}`,
        )
        updated++
      } catch {
        // Single leg failure should not block the rest
      }
    }),
  )

  console.log(`[platforms] trip=${id} updated=${updated}`)
  return NextResponse.json({ data: { updated } })
}
