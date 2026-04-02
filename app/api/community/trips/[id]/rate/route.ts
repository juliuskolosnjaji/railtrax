import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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
  const { rating } = await req.json()

  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: 'invalid_rating' }, { status: 400 })

  try {
    await prisma().communityRating.upsert({
      where: {
        uniq_community_rating_trip_user: { communityTripId: id, userId: user.id },
      },
      create: { communityTripId: id, userId: user.id, rating },
      update: { rating },
    })

    return NextResponse.json({ data: { rating } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
