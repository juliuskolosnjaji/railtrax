import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { updateTripSchema } from '@/lib/validators/trip'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const trip = await prisma.trip.findUnique({
      where: { id, userId: user.id },
      include: {
        legs: { orderBy: { position: 'asc' } },
        _count: { select: { legs: true } },
      },
    })
    if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ data: trip })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = updateTripSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    // findUnique with userId ensures we only update own trips
    const existing = await prisma.trip.findUnique({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.startDate !== undefined && {
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        }),
        ...(parsed.data.endDate !== undefined && {
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        }),
      },
    })
    return NextResponse.json({ data: trip })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.trip.findUnique({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    await prisma.trip.delete({ where: { id } })
    return NextResponse.json({ data: { id } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
