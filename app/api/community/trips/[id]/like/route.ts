import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPublicCommunityTripOrNull } from '@/lib/community'

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

  try {
    const communityTrip = await getPublicCommunityTripOrNull(id)
    if (!communityTrip)
      return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const existing = await prisma().communityLike.findUnique({
      where: {
        uniq_community_like_trip_user: { communityTripId: communityTrip.id, userId: user.id },
      },
    })

    if (existing) {
      await prisma().communityLike.delete({ where: { id: existing.id } })
      return NextResponse.json({ data: { liked: false } })
    } else {
      await prisma().communityLike.create({
        data: { communityTripId: communityTrip.id, userId: user.id },
      })
      return NextResponse.json({ data: { liked: true } })
    }
  } catch (err) {
    console.error('Like toggle error:', err)
    return NextResponse.json({ error: 'internal_error', details: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
