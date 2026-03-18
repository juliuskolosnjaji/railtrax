import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'

const IBNR_COUNTRY_MAP: Record<string, string> = {
  '80': 'DE', '85': 'AT', '88': 'CH', '87': 'FR',
}

function extractCountry(ibnr: string | null): string | null {
  if (!ibnr || ibnr.length < 2) return null
  return IBNR_COUNTRY_MAP[ibnr.slice(0, 2)] ?? null
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const trips = await prisma().trip.findMany({
    where: { userId: auth.userId, status: 'completed' },
    include: {
      legs: {
        select: {
          distanceKm: true,
          plannedDeparture: true,
          plannedArrival: true,
          originIbnr: true,
          destIbnr: true,
          operator: true,
        },
      },
    },
  })

  const allLegs = trips.flatMap(t => t.legs)
  const totalDistanceKm = allLegs.reduce((s, l) => s + (l.distanceKm ?? 0), 0)
  const totalDurationMs = allLegs.reduce((s, l) => {
    return s + (new Date(l.plannedArrival).getTime() - new Date(l.plannedDeparture).getTime())
  }, 0)

  // Countries visited
  const countries = new Set<string>()
  for (const leg of allLegs) {
    const c1 = extractCountry(leg.originIbnr)
    const c2 = extractCountry(leg.destIbnr)
    if (c1) countries.add(c1)
    if (c2) countries.add(c2)
  }

  // Operators breakdown
  const operatorCounts: Record<string, number> = {}
  for (const leg of allLegs) {
    if (leg.operator) operatorCounts[leg.operator] = (operatorCounts[leg.operator] ?? 0) + 1
  }

  return v1Ok({
    trips: trips.length,
    legs: allLegs.length,
    totalDistanceKm: Math.round(totalDistanceKm),
    totalDurationMinutes: Math.round(totalDurationMs / 60000),
    countriesVisited: Array.from(countries),
    operatorBreakdown: operatorCounts,
  })
}
