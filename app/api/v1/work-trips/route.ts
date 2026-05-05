import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TIMEZONE, getTripDateKey, listWorkTripOccurrences, getCurrentOrNextWorkTrip } from '@/lib/work-trips'

function clampDays(value: string | null): number {
  const parsed = Number.parseInt(value ?? '7', 10)
  if (!Number.isFinite(parsed)) return 7
  return Math.min(31, Math.max(1, parsed))
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const days = clampDays(url.searchParams.get('days'))
  const from = url.searchParams.get('from')
  const referenceAt = new Date(url.searchParams.get('at') ?? Date.now())
  if (Number.isNaN(referenceAt.getTime())) return v1Error('Invalid at datetime', 400, 'bad_request')

  const trips = await prisma().trip.findMany({
    where: { userId: auth.userId, isWorkTrip: true },
    include: {
      legs: { orderBy: { plannedDeparture: 'asc' } },
      _count: { select: { legs: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = trips.map((trip) => {
    const timezone = trip.recurrenceTimezone ?? DEFAULT_TIMEZONE
    const fromDate = from ?? getTripDateKey(referenceAt, timezone)
    const occurrences = listWorkTripOccurrences(trip, fromDate, days, referenceAt)
    const next = getCurrentOrNextWorkTrip([trip], referenceAt)

    return {
      ...trip,
      occurrences,
      currentOrNextOccurrence: next?.occurrence ?? null,
    }
  })

  return v1Ok(data)
}
