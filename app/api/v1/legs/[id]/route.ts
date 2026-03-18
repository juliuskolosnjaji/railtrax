import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { updateLegSchema } from '@/lib/validators/leg'

type Params = { params: Promise<{ id: string }> }

async function getLegForUser(legId: string, userId: string) {
  return prisma().leg.findFirst({ where: { id: legId, trip: { userId } } })
}

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response
  const { id } = await params

  const leg = await getLegForUser(id, auth.userId)
  if (!leg) return v1Error('Leg not found', 404, 'not_found')
  return v1Ok(leg)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return v1Error('Invalid JSON body', 400, 'invalid_body')

  const parsed = updateLegSchema.safeParse(body)
  if (!parsed.success) return v1Error('Validation error', 422, 'validation_error')

  const existing = await getLegForUser(id, auth.userId)
  if (!existing) return v1Error('Leg not found', 404, 'not_found')

  const leg = await prisma().leg.update({
    where: { id },
    data: {
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.originName !== undefined && { originName: parsed.data.originName }),
      ...(parsed.data.originIbnr !== undefined && { originIbnr: parsed.data.originIbnr }),
      ...(parsed.data.destName !== undefined && { destName: parsed.data.destName }),
      ...(parsed.data.destIbnr !== undefined && { destIbnr: parsed.data.destIbnr }),
      ...(parsed.data.plannedDeparture !== undefined && {
        plannedDeparture: new Date(parsed.data.plannedDeparture),
      }),
      ...(parsed.data.plannedArrival !== undefined && {
        plannedArrival: new Date(parsed.data.plannedArrival),
      }),
      ...(parsed.data.operator !== undefined && { operator: parsed.data.operator }),
      ...(parsed.data.trainNumber !== undefined && { trainNumber: parsed.data.trainNumber }),
      ...(parsed.data.trainType !== undefined && { trainType: parsed.data.trainType }),
      ...(parsed.data.lineName !== undefined && { lineName: parsed.data.lineName }),
      ...(parsed.data.seat !== undefined && { seat: parsed.data.seat }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
    },
  })
  return v1Ok(leg)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response
  const { id } = await params

  const existing = await getLegForUser(id, auth.userId)
  if (!existing) return v1Error('Leg not found', 404, 'not_found')

  await prisma().leg.delete({ where: { id } })
  return v1Ok({ deleted: true })
}
