import ical from 'ical-generator'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }> }
) {
  const supabase = await createClient()
  
  // Look up user by calendar token
  const { data: user } = await supabase
    .from('users')
    .select('id, username')
    .eq('calendar_token', params.token)
    .single()

  if (!user) {
    return new NextResponse('Invalid calendar token', { status: 404 })
  }

  // Get all trips for this user
  const { data: trips } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', user.id)

  if (!trips || trips.length === 0) {
    return new NextResponse('No trips found', { status: 404 })
  }

  const tripIds = trips.map(trip => trip.id)

  // Get all planned legs for these trips
  const { data: legs } = await supabase
    .from('legs')
    .select(`
      *,
      trip:trips(title)
    `)
    .in('trip_id', tripIds)
    .eq('status', 'planned')
    .order('planned_departure', { ascending: true })

  if (!legs || legs.length === 0) {
    return new NextResponse('No planned trips found', { status: 404 })
  }

  // Create calendar
  const calendar = ical({ name: `Railtripper - ${user.username}'s Trips` })

  // Add events for each leg
  type CalLeg = { train_type?: string; train_number?: string; origin_name?: string; dest_name?: string; planned_departure: string; planned_arrival: string; operator?: string; seat?: string; notes?: string; trip?: { title?: string }; [key: string]: unknown }
  legs.forEach((leg: CalLeg) => {
    const summary = leg.train_type && leg.train_number
      ? `${leg.train_type} ${leg.train_number}: ${leg.origin_name} → ${leg.dest_name}`
      : `${leg.origin_name} → ${leg.dest_name}`

    const description = [
      leg.trip?.title && `Trip: ${leg.trip.title}`,
      leg.operator && `Operator: ${leg.operator}`,
      leg.seat && `Seat: ${leg.seat}`,
      leg.notes && `Notes: ${leg.notes}`,
    ].filter(Boolean).join('\n')

    calendar.createEvent({
      start: new Date(leg.planned_departure),
      end: new Date(leg.planned_arrival),
      summary,
      description: description || undefined,
      location: `${leg.origin_name} → ${leg.dest_name}`,
      timezone: 'Europe/Berlin',
    })
  })

  // Generate ICS content
  const icsContent = calendar.toString()

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="railtripper-trips.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}