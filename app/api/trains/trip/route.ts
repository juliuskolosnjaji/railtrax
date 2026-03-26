import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tripId   = searchParams.get('tripId')
  const lineName = searchParams.get('lineName')

  if (!tripId) {
    return NextResponse.json({ error: 'missing tripId' }, { status: 400 })
  }

  try {
    const { createClient }  = await import('db-vendo-client')
    const { withRetrying }  = await import('db-vendo-client/retry.js')
    const { profile: dbnav } = await import('db-vendo-client/p/dbnav/index.js')
    const client = createClient(withRetrying(dbnav), 'railtrax/1.0 (contact@railtrax.eu)')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { trip } = await (client as any).trip(tripId, {
      stopovers: true,
      remarks:   true,
      polyline:  false,
      language:  'de',
    })

    const now = Date.now()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stopovers = ((trip.stopovers ?? []) as any[]).map((s: any) => {
      const dep = s.departure ?? s.plannedDeparture
      const arr = s.arrival   ?? s.plannedArrival
      const isPassed = dep
        ? new Date(dep).getTime() < now
        : arr ? new Date(arr).getTime() < now : false

      return {
        name:             s.stop?.name ?? '–',
        id:               s.stop?.id ?? null,
        lat:              s.stop?.location?.latitude  ?? null,
        lon:              s.stop?.location?.longitude ?? null,
        plannedDeparture: s.plannedDeparture ?? null,
        actualDeparture:  s.departure ?? null,
        plannedArrival:   s.plannedArrival ?? null,
        actualArrival:    s.arrival ?? null,
        departureDelay:   s.departureDelay ?? 0,
        arrivalDelay:     s.arrivalDelay ?? 0,
        platform:         s.plannedDeparturePlatform ?? s.plannedArrivalPlatform ?? null,
        platformActual:   s.departurePlatform ?? s.arrivalPlatform ?? null,
        cancelled:        s.cancelled ?? false,
        isPassed,
      }
    })

    const currentIdx = stopovers.findIndex(s =>
      s.plannedDeparture &&
      new Date(s.plannedDeparture).getTime() > now
    )

    return NextResponse.json({
      data: {
        tripId:      trip.id,
        lineName:    trip.line?.name ?? lineName,
        operator:    trip.line?.operator?.name ?? null,
        direction:   trip.direction ?? null,
        origin:      stopovers[0]?.name ?? null,
        destination: stopovers[stopovers.length - 1]?.name ?? null,
        cancelled:   trip.cancelled ?? false,
        currentIdx:  currentIdx === -1 ? stopovers.length - 1 : currentIdx,
        stopovers,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remarks: ((trip.remarks ?? []) as any[])
          .filter((r: any) => r.type === 'warning' || r.type === 'hint')
          .map((r: any) => ({ type: r.type, text: r.summary ?? r.text }))
          .slice(0, 3),
      },
    }, {
      headers: { 'Cache-Control': 'public, max-age=30' },
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    console.error('Trip detail error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
