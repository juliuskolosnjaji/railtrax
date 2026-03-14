import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  const { id } = await params
  try {
    const rollingStock = await prisma().rollingStock.findUnique({
      where: { id },
      include: {
        legs: {
          select: {
            leg: {
              select: {
                id: true,
                tripId: true,
                trainNumber: true,
                plannedDeparture: true,
                originName: true,
                destName: true,
                trip: {
                  select: {
                    title: true,
                    userId: true,
                  },
                },
              },
            },
            setNumber: true,
            confirmed: true,
            source: true,
          },
          take: 10,
          orderBy: { leg: { plannedDeparture: 'desc' } },
        },
        _count: {
          select: { legs: true },
        },
      },
    })

    if (!rollingStock) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ data: rollingStock })
  } catch (error) {
    console.error('Rolling stock fetch error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}