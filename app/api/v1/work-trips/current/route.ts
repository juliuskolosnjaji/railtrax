import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { getTripById } from '@/lib/vendo'
import { getActiveOccurrenceLegId, getCurrentOrNextWorkTrip } from '@/lib/work-trips'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const url = new URL(req.url)
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

  const current = getCurrentOrNextWorkTrip(trips, referenceAt)
  if (!current) return v1Ok(null)

  const activeLegId = getActiveOccurrenceLegId(current.occurrence, referenceAt)
  const activeLeg = current.trip.legs.find((leg) => leg.id === activeLegId) ?? null
  const liveJourney = activeLeg?.tripIdVendo
    ? await getTripById(activeLeg.tripIdVendo).catch(() => null)
    : null

  return v1Ok({
    trip: current.trip,
    occurrence: current.occurrence,
    activeLegId,
    liveJourney,
  })
}
