import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  // Cast to bypass the @types/pg version conflict between root and @prisma/adapter-pg
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any)
  return new PrismaClient({ adapter })
}

let prismaInstance: PrismaClient | undefined

export function prisma() {
  if (!prismaInstance) {
    prismaInstance = globalForPrisma.prisma ?? createPrismaClient()
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance
    }
  }
  return prismaInstance
}
