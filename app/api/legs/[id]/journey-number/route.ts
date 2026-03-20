import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/redis'

type Params = { params: Promise<{ id: string }> }

interface JourneyResult {
  journeyNumber: string | null
  displayName: string | null
}

async function fetchFromBahnExpert(
  tripIdVendo: string | null,
  lineName: string | null,
  trainNumber: string | null,
  originIbnr: string | null,
  plannedDeparture: Date | null,
): Promise<string | null> {
  // ── Strategy 1: journey details by HAFAS trip ID ─────────────────────────
  if (tripIdVendo) {
    try {
      const url =
        `https://bahn.expert/api/hafas/v3/journeyDetails` +
        `?journeyId=${encodeURIComponent(tripIdVendo)}&profile=db`

      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Railtrax/1.0' },
        signal: AbortSignal.timeout(5000),
      })

      if (res.ok) {
        const data = await res.json()
        const num =
          data?.train?.number ??
          data?.journey?.train?.number ??
          data?.number ??
          null
        if (num) return String(num)
      }
    } catch {
      // fall through to strategy 2
    }
  }

  // ── Strategy 2: IRIS departure board ────────────────────────────────────
  if (!originIbnr || !plannedDeparture) return null

  try {
    const url =
      `https://bahn.expert/api/iris/v2/abfahrten/${originIbnr}` +
      `?lookahead=30&lookbehind=5`

    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Railtrax/1.0' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const departures: unknown[] = data?.departures ?? data ?? []
    if (!Array.isArray(departures)) return null

    const targetLabel = (lineName ?? trainNumber ?? '').toUpperCase().replace(/\s+/g, '')
    const depMs = plannedDeparture.getTime()

    const match = departures.find((d: unknown) => {
      if (typeof d !== 'object' || d === null) return false
      const dep = d as Record<string, unknown>
      const train = dep.train as Record<string, unknown> | undefined
      const rawName = String(train?.name ?? train?.line ?? '')
      const nameNorm = rawName.toUpperCase().replace(/\s+/g, '')
      if (nameNorm !== targetLabel) return false

      const timeStr =
        dep.when ?? dep.scheduledWhen ?? dep.departure
      if (!timeStr) return true // name match, no time to verify

      const diff = Math.abs(new Date(String(timeStr)).getTime() - depMs)
      return diff < 3 * 60 * 1000
    }) as Record<string, unknown> | undefined

    if (!match) return null

    const train = match.train as Record<string, unknown> | undefined
    const num = train?.number ?? match.journeyNumber ?? null
    return num ? String(num) : null
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
    const result: JourneyResult = {
      journeyNumber: leg.journeyNumber,
      displayName: trainLabel ? `${trainLabel} (${leg.journeyNumber})` : leg.journeyNumber,
    }
    return NextResponse.json({ data: result })
  }

  // Fetch from bahn.expert (Redis-cached for 24h)
  const cacheKey = `journey-number:${id}`

  const journeyNumber = await cached(cacheKey, 86400, () =>
    fetchFromBahnExpert(
      leg.tripIdVendo,
      leg.lineName,
      leg.trainNumber,
      leg.originIbnr,
      leg.plannedDeparture,
    )
  )

  // Persist to DB so future page loads are instant (fire-and-forget)
  if (journeyNumber) {
    prisma().leg.update({
      where: { id },
      data: { journeyNumber },
    }).catch(() => {})
  }

  const result: JourneyResult = {
    journeyNumber,
    displayName: journeyNumber && trainLabel
      ? `${trainLabel} (${journeyNumber})`
      : trainLabel ?? null,
  }
  return NextResponse.json({ data: result })
}
