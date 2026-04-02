import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const prefs = await prisma().userPreferences.findUnique({
    where: { userId: user.id },
    select: { traewellingAutoCheckin: true },
  })

  return NextResponse.json({ data: { autoCheckin: prefs?.traewellingAutoCheckin ?? false } })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  if (typeof body.autoCheckin !== 'boolean') {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  await prisma().userPreferences.upsert({
    where: { userId: user.id },
    update: { traewellingAutoCheckin: body.autoCheckin },
    create: { userId: user.id, traewellingAutoCheckin: body.autoCheckin },
  })

  return NextResponse.json({ data: { autoCheckin: body.autoCheckin } })
}
