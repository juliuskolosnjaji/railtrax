import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reviewSchema = z.object({
  legId: z.string().uuid(),
  originIbnr: z.string().min(1),
  destIbnr: z.string().min(1),
  operator: z.string().optional(),
  trainType: z.string().optional(),
  scoreOverall: z.number().int().min(1).max(5),
  scoreScenery: z.number().int().min(1).max(5).optional(),
  scoreComfort: z.number().int().min(1).max(5).optional(),
  scorePunctuality: z.number().int().min(1).max(5).optional(),
  scoreWifi: z.number().int().min(1).max(5).optional(),
  text: z.string().max(2000).optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 })
  }

  try {
    const reviews = await prisma().routeReview.findMany({
      where: {
        originIbnr: origin,
        destIbnr: destination,
      },
      select: {
        id: true,
        operator: true,
        trainType: true,
        scoreOverall: true,
        scoreScenery: true,
        scoreComfort: true,
        scorePunctuality: true,
        scoreWifi: true,
        text: true,
        createdAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const count = await prisma().routeReview.count({
      where: {
        originIbnr: origin,
        destIbnr: destination,
      },
    })

    const aggregate = reviews.length > 0
      ? {
          avgOverall: reviews.reduce((sum, r) => sum + (r.scoreOverall ?? 0), 0) / reviews.length,
          avgScenery: reviews.filter(r => r.scoreScenery != null).reduce((sum, r) => sum + (r.scoreScenery ?? 0), 0) / reviews.filter(r => r.scoreScenery != null).length || null,
          avgComfort: reviews.filter(r => r.scoreComfort != null).reduce((sum, r) => sum + (r.scoreComfort ?? 0), 0) / reviews.filter(r => r.scoreComfort != null).length || null,
          avgPunctuality: reviews.filter(r => r.scorePunctuality != null).reduce((sum, r) => sum + (r.scorePunctuality ?? 0), 0) / reviews.filter(r => r.scorePunctuality != null).length || null,
          avgWifi: reviews.filter(r => r.scoreWifi != null).reduce((sum, r) => sum + (r.scoreWifi ?? 0), 0) / reviews.filter(r => r.scoreWifi != null).length || null,
        }
      : null

    return NextResponse.json({
      data: {
        count,
        aggregate,
        reviews: reviews.map((r) => ({
          id: r.id,
          operator: r.operator,
          trainType: r.trainType,
          scoreOverall: r.scoreOverall,
          scoreScenery: r.scoreScenery,
          scoreComfort: r.scoreComfort,
          scorePunctuality: r.scorePunctuality,
          scoreWifi: r.scoreWifi,
          text: r.text,
          createdAt: r.createdAt.toISOString(),
          username: r.user.username,
        })),
      },
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = reviewSchema.parse(body)

    const existing = await prisma().routeReview.findFirst({
      where: {
        userId: user.id,
        originIbnr: data.originIbnr,
        destIbnr: data.destIbnr,
      },
    })

    if (existing) {
      const updated = await prisma().routeReview.update({
        where: { id: existing.id },
        data: {
          legId: data.legId,
          operator: data.operator,
          trainType: data.trainType,
          scoreOverall: data.scoreOverall,
          scoreScenery: data.scoreScenery,
          scoreComfort: data.scoreComfort,
          scorePunctuality: data.scorePunctuality,
          scoreWifi: data.scoreWifi,
          text: data.text,
        },
      })
      return NextResponse.json({ data: updated }, { status: 200 })
    }

    const created = await prisma().routeReview.create({
      data: {
        userId: user.id,
        legId: data.legId,
        originIbnr: data.originIbnr,
        destIbnr: data.destIbnr,
        operator: data.operator,
        trainType: data.trainType,
        scoreOverall: data.scoreOverall,
        scoreScenery: data.scoreScenery,
        scoreComfort: data.scoreComfort,
        scorePunctuality: data.scorePunctuality,
        scoreWifi: data.scoreWifi,
        text: data.text,
      },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', details: err.flatten() }, { status: 422 })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
