import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const dbUser = await prisma().user.findUnique({
      where: { id: user.id },
      select: { traewellingUsername: true }
    })

    return NextResponse.json({
      data: {
        connected: !!dbUser?.traewellingUsername,
        username: dbUser?.traewellingUsername
      }
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
