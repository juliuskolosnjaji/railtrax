import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    await prisma().user.update({
      where: { id: user.id },
      data: {
        traewellingToken: null,
        traewellingUsername: null,
      },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Traewelling Disconnect Error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
