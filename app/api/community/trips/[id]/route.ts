import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  try {
    const trip = await prisma().communityTrip.findUnique({
      where: { id, isPublic: true },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        trip: {
          include: {
            legs: {
              orderBy: { plannedDeparture: 'asc' },
            },
          },
        },
        ratings: { select: { rating: true, userId: true } },
        likes: { select: { userId: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            _count: { select: { likes: true } },
          },
        },
        photos: { orderBy: { createdAt: 'asc' } },
        _count: { select: { ratings: true, likes: true, comments: true } },
      },
    })

    if (!trip)
      return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const avgRating =
      trip.ratings.length > 0
        ? trip.ratings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) /
          trip.ratings.length
        : null

    const userRating = authUser
      ? trip.ratings.find((r) => r.userId === authUser.id)?.rating ?? null
      : null

    const userLiked = authUser
      ? trip.likes.some((l) => l.userId === authUser.id)
      : false

    return NextResponse.json({
      data: { ...trip, avgRating, userRating, userLiked },
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
