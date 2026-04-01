import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  return NextResponse.json({
    displayName: user.user_metadata?.display_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    username: user.user_metadata?.username ?? user.email?.split('@')[0],
    email: user.email,
  })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { displayName, avatarUrl } = await req.json()

  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName ?? null,
        avatar_url: avatarUrl ?? null,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      displayName: displayName ?? null,
      avatarUrl: avatarUrl ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
