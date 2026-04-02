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
  const { text } = await req.json()

  const trimmed = text?.trim() ?? ''
  if (!trimmed)
    return NextResponse.json({ error: 'empty_comment' }, { status: 400 })
  if (trimmed.length > 5000)
    return NextResponse.json({ error: 'comment_too_long' }, { status: 400 })

  try {
    const comment = await prisma().communityComment.create({
      data: {
        communityTripId: id,
        userId: user.id,
        text: trimmed,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { likes: true } },
      },
    })

    return NextResponse.json({ data: comment })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
