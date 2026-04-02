import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { updateLegSchema } from '@/lib/validators/leg'

type Params = { params: Promise<{ id: string }> }
type RouteUser = { id: string }

type LegDelegate = {
  findFirst: (args: Record<string, unknown>) => Promise<unknown>
  update: (args: Record<string, unknown>) => Promise<unknown>
  delete: (args: Record<string, unknown>) => Promise<unknown>
}

export interface LegRouteDeps {
  getUser: () => Promise<RouteUser | null>
  leg: LegDelegate
}

function createRouteDeps(): LegRouteDeps {
  return {
    async getUser() {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user ? { id: user.id } : null
    },
    leg: prisma().leg as unknown as LegDelegate,
  }
}

// Verify the leg belongs to the authenticated user via its trip
async function getLegForUser(legId: string, userId: string, deps: LegRouteDeps) {
  return deps.leg.findFirst({
    where: { id: legId, trip: { userId } },
  })
}

export async function handleGetLeg(_req: NextRequest, { params }: Params, deps: LegRouteDeps = createRouteDeps()) {
  const { id } = await params
  const user = await deps.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const leg = await getLegForUser(id, user.id, deps)
    if (!leg) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ data: leg })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function handleUpdateLeg(req: NextRequest, { params }: Params, deps: LegRouteDeps = createRouteDeps()) {
  const { id } = await params
  const user = await deps.getUser()
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
    const existing = await getLegForUser(id, user.id, deps)
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // If only updating status, do a minimal update
    if (Object.keys(parsed.data).length === 1 && parsed.data.status !== undefined) {
      const leg = await deps.leg.update({
        where: { id },
        data: { status: parsed.data.status },
      })
      return NextResponse.json({ data: leg })
    }

    const leg = await deps.leg.update({
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

export async function handleDeleteLeg(_req: NextRequest, { params }: Params, deps: LegRouteDeps = createRouteDeps()) {
  const { id } = await params
  const user = await deps.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const existing = await getLegForUser(id, user.id, deps)
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    await deps.leg.delete({ where: { id } })
    return NextResponse.json({ data: { id } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, ctx: Params) {
  return handleGetLeg(req, ctx)
}

export async function PUT(req: NextRequest, ctx: Params) {
  return handleUpdateLeg(req, ctx)
}

export async function DELETE(req: NextRequest, ctx: Params) {
  return handleDeleteLeg(req, ctx)
}
