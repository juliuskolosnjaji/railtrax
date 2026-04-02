import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const shareTripSchema = z.object({
  id: z.string().uuid(),
})

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Validate trip ID
  const validation = shareTripSchema.safeParse({ id })
  if (!validation.success) {
    return NextResponse.json({ error: 'validation_error', details: validation.error.flatten() }, { status: 422 })
  }

  // Check if user owns the trip
  const existing = await prisma().trip.findUnique({
    where: { id, userId: user.id },
    select: { id: true, isPublic: true, shareToken: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Generate share token if not already shared
  let shareToken = existing.shareToken

  if (!shareToken) {
    shareToken = crypto.randomUUID()

    try {
      await prisma().trip.update({
        where: { id },
        data: { isPublic: true, shareToken },
      })
    } catch {
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_URL}/trip/${shareToken}`
  const embedUrl = `${process.env.NEXT_PUBLIC_URL}/embed/${shareToken}`

  return NextResponse.json({
    data: {
      shareUrl,
      embedUrl,
      shareToken,
    },
  }, { status: 200 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Validate trip ID
  const validation = shareTripSchema.safeParse({ id })
  if (!validation.success) {
    return NextResponse.json({ error: 'validation_error', details: validation.error.flatten() }, { status: 422 })
  }

  // Check if user owns the trip
  const existing = await prisma().trip.findUnique({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Unshare the trip
  try {
    await prisma().trip.update({
      where: { id },
      data: { isPublic: false, shareToken: null },
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  return NextResponse.json({ data: { unshared: true } }, { status: 200 })
}