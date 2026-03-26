import { NextRequest, NextResponse } from 'next/server'
import { getDepartures } from '@/lib/vendo'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ibnr: string }> }
) {
  const { ibnr } = await params
  const { searchParams } = new URL(req.url)
  const duration = parseInt(searchParams.get('duration') ?? '60')
  const type = searchParams.get('type') ?? 'dep'

  const cacheKey = `departures:${ibnr}:${type}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(
        { data: cached },
        { headers: { 'X-Cache': 'HIT' } }
      )
    }
  } catch (e) {
    console.warn('Redis read error (non-fatal):', e)
  }

  try {
    const fn = type === 'arr' 
      ? async (ibnr: string, when: Date, duration: number) => {
          return getDepartures(ibnr, when, duration)
        }
      : getDepartures

    const results = await fn(ibnr, new Date(), duration)

    const normalized = results.map((d) => ({
      tripId:         d.tripId,
      trainNumber:    d.trainNumber,
      operator:       null,
      direction:      d.direction,
      plannedTime:    d.plannedWhen,
      actualTime:     d.actualWhen,
      delay:          d.delayMinutes * 60,
      platform:       d.plannedPlatform,
      platformActual: d.actualPlatform,
      cancelled:      d.cancelled,
      remarks:        [],
    }))

    try {
      await redis.setex(cacheKey, 60, normalized)
    } catch (e) {
      console.warn('Redis write error (non-fatal):', e)
    }

    return NextResponse.json({ data: normalized }, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=60' }
    })
  } catch (err) {
    console.error('Departures error:', err)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Abfahrten' },
      { status: 500 }
    )
  }
}