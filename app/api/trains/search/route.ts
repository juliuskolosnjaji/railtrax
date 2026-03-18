import { NextRequest, NextResponse } from 'next/server'
import { getJourneyByTrainNumber } from '@/lib/vendo'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0,10)
  
  if (q.length < 2) return NextResponse.json({ data: [] })

  try {
    const normalized = q.toUpperCase().replace(/\s+/g,'')
    const trip = await getJourneyByTrainNumber(normalized, new Date(date))

    if (!trip) {
      return NextResponse.json({ data: [] })
    }

    // Return mock data for now since getJourneyByTrainNumber returns a single trip
    // In a real implementation, you'd want to search for multiple trips
    return NextResponse.json({
      data: [{
        tripId: trip.tripId,
        trainNumber: trip.lineName || normalized,
        operator: trip.operator,
        origin: trip.stops[0]?.name,
        destination: trip.stops[trip.stops.length - 1]?.name,
        departure: trip.stops[0]?.plannedDep,
        delay: 0, // Would calculate from real-time data
      }]
    })
  } catch (err) {
    console.error('Train search error:', err)
    return NextResponse.json(
      { error: 'Fehler bei der Zugsuche' },
      { status: 500 }
    )
  }
}