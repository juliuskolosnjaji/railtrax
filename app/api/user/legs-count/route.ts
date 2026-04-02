import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const count = await prisma().leg.count({
      where: {
        trip: { userId: user.id },
        status: { in: ['planned', 'checked_in'] },
      },
    })
    return NextResponse.json({ plannedLegsCount: count })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
