import ical from 'ical-generator'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: params.id, userId: user.id },
      include: {
        legs: { orderBy: { position: 'asc' } }
      }
    })

    if (!trip) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // Create calendar for this specific trip
    const calendar = ical({ name: `Railtripper - ${trip.title}` })

    // Add events for each leg
    trip.legs.forEach((leg) => {
      const summary = leg.trainType && leg.trainNumber
        ? `${leg.trainType} ${leg.trainNumber}: ${leg.originName} → ${leg.destName}`
        : `${leg.originName} → ${leg.destName}`

      const description = [
        leg.operator && `Operator: ${leg.operator}`,
        leg.seat && `Seat: ${leg.seat}`,
        leg.notes && `Notes: ${leg.notes}`,
      ].filter(Boolean).join('\n')

      calendar.createEvent({
        start: new Date(leg.plannedDeparture),
        end: new Date(leg.plannedArrival),
        summary,
        description: description || undefined,
        location: `${leg.originName} → ${leg.destName}`,
        timezone: 'Europe/Berlin',
      })
    })

    // Generate ICS content
    const icsContent = calendar.toString()

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="railtripper-${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics"`,
        'Cache-Control': 'private, max-age=0',
      },
    })
  } catch (error) {
    console.error('Calendar generation error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}