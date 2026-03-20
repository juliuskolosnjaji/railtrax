import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createTripSchema } from '@/lib/validators/trip'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const includeLegs = new URL(req.url).searchParams.get('legs') === '1'

  try {
    const prismaClient = prisma()
    const trips = includeLegs
      ? await prismaClient.trip.findMany({
          where: { userId: user.id },
          include: {
            legs: { orderBy: { plannedDeparture: 'asc' } },
            _count: { select: { legs: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : await prismaClient.trip.findMany({
          where: { userId: user.id },
          include: {
            legs: { select: { plannedDeparture: true, plannedArrival: true }, orderBy: { plannedDeparture: 'asc' } },
            _count: { select: { legs: true } },
          },
          orderBy: { createdAt: 'desc' },
        })

    // Auto-update trip status based on current time
    const now = new Date()
    const statusUpdates: Promise<unknown>[] = []

    for (const trip of trips) {
      const legs = (trip as any).legs ?? []
      if (legs.length === 0) continue
      if (trip.status === 'cancelled') continue

      const firstDep = new Date(legs[0].plannedDeparture)
      const lastArr  = new Date(legs[legs.length - 1].plannedArrival)

      let newStatus = trip.status
      if (now >= firstDep && now <= lastArr) newStatus = 'active'
      else if (now > lastArr) newStatus = 'completed'

      if (newStatus !== trip.status) {
        ;(trip as any).status = newStatus
        statusUpdates.push(
          prismaClient.trip.update({ where: { id: trip.id }, data: { status: newStatus } })
        )
      }
    }

    if (statusUpdates.length > 0) {
      await Promise.all(statusUpdates)
    }

    // Remove legs from output if not requested
    if (!includeLegs) {
      for (const trip of trips) {
        delete (trip as any).legs
      }
    }

    return NextResponse.json({ data: trips }, { headers: { 'Cache-Control': 'private, max-age=30' } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createTripSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    const trip = await prisma().trip.create({
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
