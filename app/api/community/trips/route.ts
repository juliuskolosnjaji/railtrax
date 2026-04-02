import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sort = searchParams.get('sort') ?? 'popular'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 12

  const orderBy =
    sort === 'new'
      ? { createdAt: 'desc' as const }
      : sort === 'top'
        ? { likes: { _count: 'desc' as const } }
        : { ratings: { _count: 'desc' as const } }

  try {
    const trips = await prisma().communityTrip.findMany({
      where: { isPublic: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        trip: {
          include: {
            legs: {
              select: {
                id: true,
                originName: true,
                destName: true,
                originLat: true,
                originLon: true,
                destLat: true,
                destLon: true,
                lineName: true,
                trainNumber: true,
                operator: true,
                distanceKm: true,
                plannedDeparture: true,
                plannedArrival: true,
                polyline: true,
              },
              orderBy: { plannedDeparture: 'asc' },
              take: 50,
            },
          },
        },
        _count: { select: { ratings: true, likes: true, comments: true } },
        ratings: { select: { rating: true } },
      },
    })

    const withStats = trips.map((t) => ({
      ...t,
      avgRating:
        t.ratings.length > 0
          ? t.ratings.reduce((s, r) => s + r.rating, 0) / t.ratings.length
          : null,
    }))

    return NextResponse.json({ data: withStats })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { tripId, description, isPublic } = await req.json()

  try {
    const trip = await prisma().trip.findUnique({ where: { id: tripId } })
    if (!trip || trip.userId !== user.id)
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const existing = await prisma().communityTrip.findUnique({
      where: { tripId },
    })
    if (existing)
      return NextResponse.json(
        { error: 'already_published' },
        { status: 400 },
      )

    const communityTrip = await prisma().communityTrip.create({
      data: {
        userId: user.id,
        tripId,
        title: trip.title,
        description: description ?? null,
        isPublic: isPublic ?? true,
      },
    })

    return NextResponse.json({ data: communityTrip }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
