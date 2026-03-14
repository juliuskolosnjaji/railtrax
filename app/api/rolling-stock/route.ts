import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().optional(),
  operator: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchSchema.parse({
      q: searchParams.get('q') || undefined,
      operator: searchParams.get('operator') || undefined,
      limit: searchParams.get('limit') || 10,
    })

    const where = {
      ...(query.q && {
        OR: [
          { series: { contains: query.q, mode: 'insensitive' as const } },
          { operator: { contains: query.q, mode: 'insensitive' as const } },
          { manufacturer: { contains: query.q, mode: 'insensitive' as const } },
        ],
      }),
      ...(query.operator && {
        operator: { contains: query.operator, mode: 'insensitive' as const },
      }),
    }

    const rollingStock = await prisma.rollingStock.findMany({
      where,
      take: query.limit,
      orderBy: [
        { operator: 'asc' },
        { series: 'asc' },
      ],
      select: {
        id: true,
        operator: true,
        series: true,
        manufacturer: true,
        maxSpeedKmh: true,
        introducedYear: true,
        hasWifi: true,
        hasBistro: true,
        hasWheelchair: true,
        hasBikeSpace: true,
        photoUrl: true,
      },
    })

    return NextResponse.json({ data: rollingStock })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'validation_error', details: error.flatten() }, { status: 422 })
    }
    console.error('Rolling stock search error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}