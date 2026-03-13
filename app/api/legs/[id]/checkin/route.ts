import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkin, TraewellingError } from '@/lib/traewelling'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    // 1. Fetch user to get Träwelling token
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { traewellingToken: true }
    })

    if (!dbUser?.traewellingToken) {
      return NextResponse.json({ error: 'not_connected', message: 'Träwelling account is not connected.' }, { status: 400 })
    }

    // 2. Fetch leg and verify ownership through trip
    const leg = await prisma.leg.findUnique({
      where: { id: params.id },
      include: { trip: true }
    })

    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (leg.trip.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // 3. Perform check-in via lib/traewelling.ts
    const { statusId } = await checkin(dbUser.traewellingToken, leg)

    // 4. Update the leg in database
    const updatedLeg = await prisma.leg.update({
      where: { id: leg.id },
      data: {
        status: 'checked_in',
        traewellingStatusId: statusId
      }
    })

    return NextResponse.json({ data: updatedLeg })

  } catch (error) {
    if (error instanceof TraewellingError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 })
    }
    console.error('Checkin API error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
