import { NextRequest, NextResponse } from 'next/server'
import { getTripById, VendoTrip } from '@/lib/vendo'

const SCAN_HUBS = [
  '8000105', // Frankfurt Hbf
  '8011160', // Berlin Hbf
  '8000261', // München Hbf
  '8000091', // Hamburg Hbf
  '8000286', // Köln Hbf
  '8000155', // Düsseldorf Hbf
  '8000119', // Stuttgart Hbf
  '8000107', // Frankfurt Airport
]

async function findTripByTrainNumber(trainNumber: string, date: Date): Promise<VendoTrip | null> {
  const normalized = trainNumber.replace(/\s+/g, '').toLowerCase()
  
  // Create a fresh client without retry wrapper for faster scanning
  const { createClient } = await import('db-vendo-client')
  const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js')
  const client = createClient(dbnavProfile, 'railtrax/1.0 (contact@railtrax.eu)')
  
  for (const hubId of SCAN_HUBS) {
    try {
      const { departures } = await client.departures(hubId, {
        when: date,
        duration: 180,
        results: 60,
      })
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = (departures as any[]).find((dep: any) => {
        if (!dep.tripId || dep.cancelled) return false
        const lineName = (dep.line?.name ?? '').replace(/\s+/g, '').toLowerCase()
        return lineName === normalized
      })
      
      if (match) {
        const trip = await getTripById(match.tripId)
        if (trip) return trip
      }
    } catch (e) {
      console.error(`Error scanning ${hubId}:`, e)
    }
  }
  
  return null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trainNumber: string }> }
) {
  const { trainNumber } = await params
  const { searchParams } = new URL(req.url)
  
  // Default to current time if no date provided
  const dateStr = searchParams.get('date')
  const date = dateStr ? new Date(dateStr) : new Date()
  
  // If date is in the past (like midnight), use current time
  if (date < new Date()) {
    date.setHours(new Date().getHours(), 0, 0, 0)
  }
  
  // If tripId is provided, do a direct lookup (faster, more reliable)
  const tripIdParam = searchParams.get('tripId')

  try {
    let trip: VendoTrip | null = null

    if (tripIdParam) {
      try {
        trip = await getTripById(tripIdParam)
      } catch (e) {
        console.error('Direct tripId lookup failed, falling back to search:', e)
      }
    }

    if (!trip) {
      trip = await findTripByTrainNumber(trainNumber, date)
    }

    if (!trip) {
      return NextResponse.json(
        { error: 'Zug nicht gefunden. Bitte versuche einen anderen Zug oder ein anderes Datum.' },
        { status: 404 }
      )
    }

    const stops = trip.stops.map(s => {
      const plannedArrMs = s.plannedArr ? new Date(s.plannedArr).getTime() : 0
      const actualArrMs = s.actualArr ? new Date(s.actualArr).getTime() : 0
      const plannedDepMs = s.plannedDep ? new Date(s.plannedDep).getTime() : 0
      const actualDepMs = s.actualDep ? new Date(s.actualDep).getTime() : 0
      
      return {
        stationName: s.name,
        stationId:   s.ibnr,
        arrival:     s.plannedArr,
        arrivalDelay: actualArrMs > plannedArrMs ? Math.round((actualArrMs - plannedArrMs) / 60000) : 0,
        departure:   s.plannedDep,
        departureDelay: actualDepMs > plannedDepMs ? Math.round((actualDepMs - plannedDepMs) / 60000) : 0,
        platform:    s.platform,
        platformActual: s.platform,
        cancelled:   false,
        passed:      s.plannedDep
          ? new Date(s.plannedDep) < new Date()
          : false,
      }
    })

    const nowMs = Date.now()
    const currentStopIdx = stops.findIndex(s =>
      s.departure && new Date(s.departure).getTime() > nowMs
    )

    return NextResponse.json({
      data: {
        tripId:      trip.tripId,
        trainNumber: trainNumber.toUpperCase(),
        lineName:    trip.lineName || trainNumber,
        operator:    trip.operator,
        direction:   stops.length > 1 ? stops[stops.length - 1]?.stationName : null,
        origin:      stops[0]?.stationName,
        destination: stops[stops.length - 1]?.stationName,
        stops,
        currentStopIdx: currentStopIdx >= 0 ? currentStopIdx : stops.length - 1,
        cancelled:   false,
        rollingStock: null,
      }
    })
  } catch (err) {
    console.error('Train detail error:', err)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Zugdaten' },
      { status: 500 }
    )
  }
}
