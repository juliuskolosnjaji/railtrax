import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

async function backfillDistances() {
  console.log('Backfilling distance_km for legs without coordinates...')

  const legs = await prisma.leg.findMany({
    where: {
      distanceKm: null,
      originLat: { not: null },
      originLon: { not: null },
      destLat: { not: null },
      destLon: { not: null },
    },
    select: { id: true, originLat: true, originLon: true, destLat: true, destLon: true },
  })

  console.log(`Found ${legs.length} legs to update`)

  for (const leg of legs) {
    if (leg.originLat && leg.originLon && leg.destLat && leg.destLon) {
      const distanceKm = Math.round(
        haversineKm(leg.originLat, leg.originLon, leg.destLat, leg.destLon) * 10
      ) / 10

      await prisma.leg.update({
        where: { id: leg.id },
        data: { distanceKm },
      })

      console.log(`Updated leg ${leg.id}: ${distanceKm} km`)
    }
  }

  console.log('Done!')
}

backfillDistances()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
