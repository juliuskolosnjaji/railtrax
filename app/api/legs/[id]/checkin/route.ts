import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { checkin, TraewellingError } from '@/lib/traewelling'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    console.log('Checkin started for leg:', id, 'user:', user.id)

    const dbUser = await prisma().user.findUnique({
      where: { id: user.id },
      select: { traewellingToken: true },
    })

    console.log('Token present:', !!dbUser?.traewellingToken,
      'length:', dbUser?.traewellingToken?.length)

    if (!dbUser?.traewellingToken) {
      return NextResponse.json(
        { error: 'not_connected', message: 'Träwelling account is not connected.' },
        { status: 400 }
      )
    }

    const leg = await prisma().leg.findUnique({
      where: { id },
      include: { trip: true },
    })

    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (leg.trip.userId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    console.log('Leg data:', JSON.stringify({
      originName:       leg.originName,
      originIbnr:       leg.originIbnr,
      destIbnr:         leg.destIbnr,
      trainNumber:      leg.trainNumber,
      lineName:         leg.lineName,
      plannedDeparture: leg.plannedDeparture,
    }))

    const { statusId } = await checkin(dbUser.traewellingToken, leg)

    const updatedLeg = await prisma().leg.update({
      where: { id: leg.id },
      data: { status: 'checked_in', traewellingStatusId: statusId },
    })

    return NextResponse.json({ data: updatedLeg })

  } catch (error) {
    if (error instanceof TraewellingError) {
      console.error('TraewellingError:', error.code, error.message)
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 }
      )
    }
    console.error('Checkin unexpected error:', error)
    return NextResponse.json(
      { error: 'internal_error', message: String(error) },
      { status: 500 }
    )
  }
}
