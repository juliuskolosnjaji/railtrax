import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    // Verify token with Träwelling API
    const res = await fetch('https://traewelling.de/api/v1/auth/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // Do not cache this request
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 422 })
    }

    const { data: traewellingUser } = await res.json()
    const username = traewellingUser.username

    // Save token and username to user record in DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        traewellingToken: token,
        traewellingUsername: username,
      },
    })

    return NextResponse.json({ data: { username } })
  } catch (error) {
    console.error('Traewelling Connect Error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
