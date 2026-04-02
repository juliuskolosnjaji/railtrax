import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { updateTripSchema } from '@/lib/validators/trip'

type Params = { params: Promise<{ id: string }> }
type RouteUser = { id: string }

type TripDelegate = {
  findUnique: (args: Record<string, unknown>) => Promise<unknown>
  update: (args: Record<string, unknown>) => Promise<unknown>
  delete: (args: Record<string, unknown>) => Promise<unknown>
}

export interface TripRouteDeps {
  getUser: () => Promise<RouteUser | null>
  trip: TripDelegate
}

function createRouteDeps(): TripRouteDeps {
  return {
    async getUser() {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user ? { id: user.id } : null
    },
    trip: prisma().trip as unknown as TripDelegate,
  }
}

export async function handleGetTrip(_req: NextRequest, { params }: Params, deps: TripRouteDeps = createRouteDeps()) {
  const { id } = await params
  const user = await deps.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const trip = await deps.trip.findUnique({
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

export async function handleUpdateTrip(req: NextRequest, { params }: Params, deps: TripRouteDeps = createRouteDeps()) {
  const { id } = await params
  const user = await deps.getUser()
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
    const existing = await deps.trip.findUnique({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const trip = await deps.trip.update({
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

export async function handleDeleteTrip(_req: NextRequest, { params }: Params, deps: TripRouteDeps = createRouteDeps()) {
  const { id } = await params
  const user = await deps.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const existing = await deps.trip.findUnique({ where: { id, userId: user.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    await deps.trip.delete({ where: { id } })
    return NextResponse.json({ data: { id } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, ctx: Params) {
  return handleGetTrip(req, ctx)
}

export async function PUT(req: NextRequest, ctx: Params) {
  return handleUpdateTrip(req, ctx)
}

export async function DELETE(req: NextRequest, ctx: Params) {
  return handleDeleteTrip(req, ctx)
}
