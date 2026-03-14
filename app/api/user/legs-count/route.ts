import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'missing_user_id' }, { status: 400 })
  }

  try {
    const count = await prisma.leg.count({
      where: {
        trip: { userId },
        status: { in: ['planned', 'checked_in'] },
      },
    })
    return NextResponse.json({ plannedLegsCount: count })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
