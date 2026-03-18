import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { updateTripSchema } from '@/lib/validators/trip'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response
  const { id } = await params

  const trip = await prisma().trip.findUnique({
    where: { id, userId: auth.userId },
    include: { legs: { orderBy: { plannedDeparture: 'asc' } }, _count: { select: { legs: true } } },
  })
  if (!trip) return v1Error('Trip not found', 404, 'not_found')
  return v1Ok(trip)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return v1Error('Invalid JSON body', 400, 'invalid_body')

  const parsed = updateTripSchema.safeParse(body)
  if (!parsed.success) return v1Error('Validation error', 422, 'validation_error')

  const existing = await prisma().trip.findUnique({ where: { id, userId: auth.userId } })
  if (!existing) return v1Error('Trip not found', 404, 'not_found')

  const trip = await prisma().trip.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.startDate !== undefined && {
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      }),
      ...(parsed.data.endDate !== undefined && {
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      }),
    },
    include: { _count: { select: { legs: true } } },
  })
  return v1Ok(trip)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response
  const { id } = await params

  const existing = await prisma().trip.findUnique({ where: { id, userId: auth.userId } })
  if (!existing) return v1Error('Trip not found', 404, 'not_found')

  await prisma().trip.delete({ where: { id } })
  return v1Ok({ deleted: true })
}
