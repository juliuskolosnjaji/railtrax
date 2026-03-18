import { NextRequest, NextResponse } from 'next/server'
import { getDepartures } from '@/lib/vendo'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ibnr: string }> }
) {
  const { ibnr } = await params
  const { searchParams } = new URL(req.url)
  const duration = parseInt(searchParams.get('duration') ?? '60')
  const type = searchParams.get('type') ?? 'dep'

  try {
    const fn = type === 'arr' 
      ? async (ibnr: string, when: Date, duration: number) => {
          // For arrivals, we'll use departures and filter logic
          // In a real implementation, you'd use arrivals endpoint if available
          return getDepartures(ibnr, when, duration)
        }
      : getDepartures

    const results = await fn(ibnr, new Date(), duration)

    const normalized = results.map((d) => ({
      tripId:         d.tripId,
      trainNumber:    d.trainNumber,
      operator:       null, // Would need to derive from IBNR or line data
      direction:      d.direction,
      plannedTime:    d.plannedWhen,
      actualTime:     d.actualWhen,
      delay:          d.delayMinutes * 60, // Convert minutes to seconds
      platform:       d.plannedPlatform,
      platformActual: d.actualPlatform,
      cancelled:      d.cancelled,
      remarks:        [], // Would need to fetch from remarks data
    }))

    // Cache 60 seconds
    return NextResponse.json({ data: normalized }, {
      headers: { 'Cache-Control': 'public, max-age=60' }
    })
  } catch (err) {
    console.error('Departures error:', err)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Abfahrten' },
      { status: 500 }
    )
  }
}