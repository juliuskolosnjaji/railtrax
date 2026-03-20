import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { createLegSchema } from '@/lib/validators/leg'

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return v1Error('Invalid JSON body', 400, 'invalid_body')

  const parsed = createLegSchema.safeParse(body)
  if (!parsed.success) return v1Error('Validation error', 422, 'validation_error')

  // Verify the trip belongs to this user
  const trip = await prisma().trip.findUnique({
    where: { id: parsed.data.tripId, userId: auth.userId },
  })
  if (!trip) return v1Error('Trip not found', 404, 'not_found')

  const { tripId, ...legData } = parsed.data

  // Auto-assign position
  const lastLeg = await prisma().leg.findFirst({
    where: { tripId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const position = (lastLeg?.position ?? -1) + 1

  const leg = await prisma().leg.create({
    data: { ...legData, tripId, position },
  })
  return v1Ok(leg)
}
