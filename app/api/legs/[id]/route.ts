import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { updateLegSchema } from '@/lib/validators/leg'

type Params = { params: Promise<{ id: string }> }

// Verify the leg belongs to the authenticated user via its trip
async function getLegForUser(legId: string, userId: string) {
  return prisma().leg.findFirst({
    where: { id: legId, trip: { userId } },
  })
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const leg = await getLegForUser(id, user.id)
    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ data: leg })
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
  const parsed = updateLegSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    const existing = await getLegForUser(id, user.id)
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // If only updating status, do a minimal update
    if (Object.keys(parsed.data).length === 1 && parsed.data.status !== undefined) {
      const leg = await prisma().leg.update({
        where: { id },
        data: { status: parsed.data.status },
      })
      return NextResponse.json({ data: leg })
    }

    const leg = await prisma().leg.update({
      where: { id },
      data: {
        ...(parsed.data.originName !== undefined && { originName: parsed.data.originName }),
        ...(parsed.data.originIbnr !== undefined && { originIbnr: parsed.data.originIbnr }),
        ...(parsed.data.destName !== undefined && { destName: parsed.data.destName }),
        ...(parsed.data.destIbnr !== undefined && { destIbnr: parsed.data.destIbnr }),
        ...(parsed.data.plannedDeparture !== undefined && {
          plannedDeparture: new Date(parsed.data.plannedDeparture),
        }),
        ...(parsed.data.plannedArrival !== undefined && {
          plannedArrival: new Date(parsed.data.plannedArrival),
        }),
        ...(parsed.data.operator !== undefined && { operator: parsed.data.operator }),
        ...(parsed.data.trainNumber !== undefined && { trainNumber: parsed.data.trainNumber }),
        ...(parsed.data.trainType !== undefined && { trainType: parsed.data.trainType }),
        ...(parsed.data.lineName !== undefined && { lineName: parsed.data.lineName }),
        ...(parsed.data.seat !== undefined && { seat: parsed.data.seat }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    })
    return NextResponse.json({ data: leg })
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
    const existing = await getLegForUser(id, user.id)
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    await prisma().leg.delete({ where: { id } })
    return NextResponse.json({ data: { id } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
