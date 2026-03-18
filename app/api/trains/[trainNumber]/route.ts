import { NextRequest, NextResponse } from 'next/server'
import { getJourneyByTrainNumber, VendoStop } from '@/lib/vendo'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trainNumber: string }> }
) {
  const { trainNumber } = await params
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const date = new Date(dateStr)

  try {
    // Use the hub scan method to find the train
    const trip = await getJourneyByTrainNumber(trainNumber, date)

    if (!trip) {
      return NextResponse.json(
        { error: 'Zug nicht gefunden' },
        { status: 404 }
      )
    }

    // Normalize stopover data
    const stops = trip.stops.map((s: VendoStop) => ({
      stationName: s.name,
      stationId:   s.ibnr,
      arrival:     s.plannedArr,
      arrivalDelay: s.actualArr && s.plannedArr 
        ? Math.round((new Date(s.actualArr).getTime() - new Date(s.plannedArr).getTime()) / 60000) 
        : 0,
      departure:   s.plannedDep,
      departureDelay: s.actualDep && s.plannedDep
        ? Math.round((new Date(s.actualDep).getTime() - new Date(s.plannedDep).getTime()) / 60000)
        : 0,
      platform:    s.platform,
      platformActual: s.platform,
      cancelled:   false, // TODO: fetch real cancelled status
      passed:      s.plannedDep
        ? new Date(s.plannedDep) < new Date()
        : false,
    }))

    // Find current stop (first future stop)
    const nowMs = Date.now()
    const currentStopIdx = stops.findIndex(s =>
      s.departure && new Date(s.departure).getTime() > nowMs
    )

    return NextResponse.json({
      data: {
        tripId:      trip.tripId,
        trainNumber: trainNumber.toUpperCase(),
        lineName:    trip.lineName,
        operator:    trip.operator,
        direction:   stops.length > 1 ? stops[stops.length - 1]?.stationName : null,
        origin:      stops[0]?.stationName,
        destination: stops[stops.length - 1]?.stationName,
        stops,
        currentStopIdx,
        cancelled:   false, // TODO: fetch real cancelled status
        rollingStock: null, // enriched separately
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