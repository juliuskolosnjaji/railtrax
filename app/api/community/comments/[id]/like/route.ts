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

  try {
    const comment = await prisma().communityComment.findUnique({
      where: { id },
      select: { id: true, communityTrip: { select: { id: true, isPublic: true } } },
    })
    if (!comment || !comment.communityTrip.isPublic) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const existing = await prisma().commentLike.findUnique({
      where: {
        uniq_comment_like_comment_user: { commentId: comment.id, userId: user.id },
      },
    })

    if (existing) {
      await prisma().commentLike.delete({ where: { id: existing.id } })
      return NextResponse.json({ data: { liked: false } })
    } else {
      await prisma().commentLike.create({
        data: { commentId: comment.id, userId: user.id },
      })
      return NextResponse.json({ data: { liked: true } })
    }
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
