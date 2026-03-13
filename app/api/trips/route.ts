import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPlan, getLimit } from '@/lib/entitlements'
import { createTripSchema } from '@/lib/validators/trip'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const trips = await prisma.trip.findMany({
      where: { userId: user.id },
      include: { _count: { select: { legs: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: trips })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const plan = getPlan(user.app_metadata as { plan?: string })
  const maxTrips = getLimit(plan, 'maxTrips')

  if (maxTrips !== Infinity) {
    const { data: usage } = await supabase
      .from('usage_counters')
      .select('trips_count')
      .eq('user_id', user.id)
      .single()

    const current = usage?.trips_count ?? 0
    if (current >= maxTrips) {
      return NextResponse.json(
        { error: 'limit_reached', limit: maxTrips, current, upgrade: true },
        { status: 403 },
      )
    }
  }

  const body = await req.json()
  const parsed = createTripSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
    })
    return NextResponse.json({ data: trip }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
