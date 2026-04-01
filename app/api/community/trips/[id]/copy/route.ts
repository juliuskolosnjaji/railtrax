import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { searchJourneys, searchStations } from '@/lib/vendo'

async function resolveIbnr(name: string): Promise<string | null> {
  if (!name || name.length < 2) return null
  try {
    const stations = await searchStations(name)
    if (stations?.length > 0) return stations[0].id
  } catch {
    // ignore
  }
  return null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const { startDate, startTime, selectedJourneyIndex } = await req.json()

  try {
    const communityTrip = await prisma().communityTrip.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            legs: { orderBy: { plannedDeparture: 'asc' } },
          },
        },
      },
    })
    if (!communityTrip)
      return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const templateLegs = communityTrip.trip.legs
    if (templateLegs.length === 0)
      return NextResponse.json({ error: 'no_legs' }, { status: 400 })

    let originIbnr = templateLegs[0].originIbnr
    let destIbnr = templateLegs[templateLegs.length - 1].destIbnr

    if (!originIbnr) {
      const name = templateLegs[0].originName
      originIbnr = await resolveIbnr(name)
    }
    if (!destIbnr) {
      const name = templateLegs[templateLegs.length - 1].destName
      destIbnr = await resolveIbnr(name)
    }

    if (!originIbnr || !destIbnr)
      return NextResponse.json(
        { error: `Station nicht gefunden (origin: ${templateLegs[0].originName}, dest: ${templateLegs[templateLegs.length - 1].destName})` },
        { status: 400 },
      )

    const datetime = new Date(`${startDate}T${startTime}:00`)

    if (selectedJourneyIndex === undefined || selectedJourneyIndex === null) {
      const journeys = await searchJourneys(
        originIbnr,
        destIbnr,
        datetime,
        2,
      )

      if (!journeys?.length)
        return NextResponse.json(
          { error: 'no_connections' },
          { status: 404 },
        )

      const options = journeys.slice(0, 3).map((j, i) => ({
        index: i,
        departure: j.legs?.[0]?.departure,
        arrival: j.legs?.[j.legs.length - 1]?.arrival,
        changes: (j.legs?.length ?? 1) - 1,
        legs: j.legs?.map((l) => ({
          lineName: l.trainNumber ?? '?',
          operator: l.operator ?? null,
        })),
      }))
      return NextResponse.json({ data: { options } })
    }

    const journeys = await searchJourneys(originIbnr, destIbnr, datetime, 2)
    const selectedJourney = journeys?.[selectedJourneyIndex]
    if (!selectedJourney)
      return NextResponse.json({ error: 'invalid_index' }, { status: 400 })

    const newTrip = await prisma().trip.create({
      data: {
        userId: user.id,
        title: `${communityTrip.title} (Kopie)`,
        status: 'planned',
      },
    })

    const legData = selectedJourney.legs.map((l, idx) => ({
      tripId: newTrip.id,
      position: idx,
      originName: l.origin ?? '–',
      destName: l.destination ?? '–',
      originIbnr: l.originIbnr ?? null,
      destIbnr: l.destinationIbnr ?? null,
      originLat: l.originLat ?? null,
      originLon: l.originLon ?? null,
      destLat: l.destinationLat ?? null,
      destLon: l.destinationLon ?? null,
      plannedDeparture: new Date(l.departure),
      plannedArrival: new Date(l.arrival),
      lineName: l.trainNumber ?? null,
      trainNumber: l.trainNumber ?? null,
      operator: l.operator ?? null,
      tripIdVendo: l.tripId ?? null,
      status: 'planned',
    }))

    await prisma().leg.createMany({ data: legData })

    return NextResponse.json({
      data: { tripId: newTrip.id, legsCreated: legData.length },
    })
  } catch (err) {
    console.error('Copy route error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
