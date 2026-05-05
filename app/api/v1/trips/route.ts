import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { createTripSchema } from '@/lib/validators/trip'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const includeLegs = url.searchParams.get('legs') === '1'
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')))
  const skip = (page - 1) * limit

  const where = { userId: auth.userId }
  const [trips, total] = await Promise.all([
    prisma().trip.findMany({
      where,
      include: includeLegs
        ? { legs: { orderBy: { plannedDeparture: 'asc' } }, _count: { select: { legs: true } } }
        : { _count: { select: { legs: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma().trip.count({ where }),
  ])

  return v1Ok(trips, { page, limit, total, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return v1Error('Invalid JSON body', 400, 'invalid_body')

  const parsed = createTripSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error('Validation error', 422, 'validation_error')
  }

  const trip = await prisma().trip.create({
    data: {
      userId: auth.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      isWorkTrip: parsed.data.isWorkTrip ?? false,
      recurrenceRule: parsed.data.recurrence ?? Prisma.DbNull,
      recurrenceTimezone: parsed.data.recurrence?.timezone ?? null,
    },
    include: { _count: { select: { legs: true } } },
  })

  return v1Ok(trip)
}
