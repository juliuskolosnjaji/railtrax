import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { prisma } from '@/lib/prisma'
import { checkin, TraewellingError } from '@/lib/traewelling'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req)
  if ('userId' in auth === false) return auth as Response

  const { id } = await params

  const dbUser = await prisma().user.findUnique({
    where: { id: (auth as { userId: string }).userId },
    select: { traewellingToken: true },
  })

  if (!dbUser?.traewellingToken) {
    return v1Error('Träwelling-Account nicht verbunden.', 400, 'NOT_CONNECTED')
  }

  const leg = await prisma().leg.findUnique({
    where: { id },
    include: { trip: true },
  })

  if (!leg) return v1Error('Abschnitt nicht gefunden.', 404, 'NOT_FOUND')
  if (leg.trip.userId !== (auth as { userId: string }).userId) {
    return v1Error('Kein Zugriff.', 403, 'FORBIDDEN')
  }

  try {
    const { statusId } = await checkin(dbUser.traewellingToken, leg)
    const updated = await prisma().leg.update({
      where: { id },
      data: { status: 'checked_in', traewellingStatusId: statusId },
    })
    return v1Ok(updated)
  } catch (error) {
    if (error instanceof TraewellingError) {
      return v1Error(error.message, 400, error.code.toUpperCase())
    }
    console.error('V1 checkin error:', error)
    return v1Error(String(error), 500, 'INTERNAL_ERROR')
  }
}
