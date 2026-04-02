import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const PUBLIC_LEG_SELECT = {
  id: true,
  position: true,
  originName: true,
  originIbnr: true,
  originLat: true,
  originLon: true,
  plannedDeparture: true,
  actualDeparture: true,
  destName: true,
  destIbnr: true,
  destLat: true,
  destLon: true,
  plannedArrival: true,
  actualArrival: true,
  operator: true,
  lineName: true,
  trainType: true,
  trainNumber: true,
  platformPlanned: true,
  platformActual: true,
  delayMinutes: true,
  cancelled: true,
  distanceKm: true,
  polyline: true,
} satisfies Prisma.LegSelect

export async function getPublicCommunityTripOrNull(id: string) {
  return prisma().communityTrip.findUnique({
    where: { id, isPublic: true },
    select: { id: true, isPublic: true, tripId: true, userId: true },
  })
}
