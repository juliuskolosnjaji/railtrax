import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  const adapter = new PrismaPg(pool as any)
  const prisma = new PrismaClient({ adapter })
  const legs = await prisma.leg.findMany({
    select: { id: true, lineName: true, trainNumber: true, operator: true, originIbnr: true },
    take: 20,
    orderBy: { plannedDeparture: 'desc' },
  })
  console.table(legs.map(l => ({
    lineName: l.lineName,
    trainNumber: l.trainNumber,
    operator: l.operator,
    originIbnr: l.originIbnr,
  })))
  await prisma.$disconnect()
}

main().catch(console.error)
