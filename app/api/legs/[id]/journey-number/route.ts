import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/redis'

type Params = { params: Promise<{ id: string }> }

interface JourneyResult {
  journeyNumber: string | null
  displayName: string | null
}

/**
 * Fetch Fahrtnummer via db-vendo-client (same client used for polylines).
 * Strategy:
 *   1. tripIdVendo present → client.trip() → raw trip.line.fahrtNr
 *   2. originIbnr + departure → client.departures() → find matching line → fahrtNr
 */
async function fetchJourneyNumber(
  tripIdVendo: string | null,
  lineName: string | null,
  trainNumber: string | null,
  originIbnr: string | null,
  plannedDeparture: Date | null,
): Promise<string | null> {
  // Dynamic import — db-vendo-client is ESM-only (serverExternalPackages)
  let client: ReturnType<typeof import('db-vendo-client')['createClient']>
  try {
    const { createClient } = await import('db-vendo-client')
    const { withRetrying } = await import('db-vendo-client/retry.js')
    const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js')
    client = createClient(withRetrying(dbnavProfile), 'railtrax/1.0 (contact@railtrax.eu)')
  } catch {
    return null
  }

  // ── Strategy 1: direct trip lookup via stored tripId ─────────────────────
  if (tripIdVendo) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { trip } = await (client as any).trip(tripIdVendo, { stopovers: false, polyline: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fahrtNr = (trip as any)?.line?.fahrtNr ?? null
      if (fahrtNr) return String(fahrtNr)
    } catch {
      // fall through to departure board
    }
  }

  // ── Strategy 2: departure board scan ─────────────────────────────────────
  if (!originIbnr || !plannedDeparture) return null

  try {
    // Fetch a 60-minute window around the planned departure
    const when = new Date(plannedDeparture.getTime() - 5 * 60 * 1000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { departures } = await (client as any).departures(originIbnr, {
      when,
      duration: 70,
      results: 60,
      products: {
        nationalExpress: true, national: true,
        regionalExpress: true, regional: true,
        suburban: true, bus: false, ferry: false,
        subway: false, tram: false, taxi: false,
      },
    })

    const targetLabel = (lineName ?? trainNumber ?? '').toUpperCase().replace(/\s+/g, '')
    const depMs = plannedDeparture.getTime()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = (departures as any[]).find((d: any) => {
      const name = (d.line?.name ?? '').toUpperCase().replace(/\s+/g, '')
      if (name !== targetLabel) return false
      const dTime = d.plannedWhen ?? d.when
      if (!dTime) return true
      return Math.abs(new Date(dTime).getTime() - depMs) < 3 * 60 * 1000
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fahrtNr = (match as any)?.line?.fahrtNr ?? null
    return fahrtNr ? String(fahrtNr) : null
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const leg = await prisma().leg.findUnique({
    where: { id },
    select: {
      id: true,
      lineName: true,
      trainNumber: true,
      tripIdVendo: true,
      originIbnr: true,
      plannedDeparture: true,
      journeyNumber: true,
    },
  })

  if (!leg) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const trainLabel = leg.lineName ?? leg.trainNumber

  // Return DB-cached value immediately
  if (leg.journeyNumber) {
    return NextResponse.json({
      data: {
        journeyNumber: leg.journeyNumber,
        displayName: trainLabel ? `${trainLabel} (${leg.journeyNumber})` : leg.journeyNumber,
      } satisfies JourneyResult,
    })
  }

  // Fetch (Redis-cached 24h)
  const cacheKey = `journey-number:${id}`
  const journeyNumber = await cached(cacheKey, 86400, () =>
    fetchJourneyNumber(
      leg.tripIdVendo,
      leg.lineName,
      leg.trainNumber,
      leg.originIbnr,
      leg.plannedDeparture,
    )
  )

  // Persist to DB — fire-and-forget
  if (journeyNumber) {
    prisma().leg.update({ where: { id }, data: { journeyNumber } }).catch(() => {})
  }

  return NextResponse.json({
    data: {
      journeyNumber,
      displayName: journeyNumber && trainLabel
        ? `${trainLabel} (${journeyNumber})`
        : (trainLabel ?? null),
    } satisfies JourneyResult,
  })
}
