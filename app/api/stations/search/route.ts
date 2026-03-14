import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchStations } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await checkSearchRateLimit(user.id)
  if (limited) return limited

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ data: [] })

  try {
    const stations = await searchStations(q)
    return NextResponse.json({ data: stations })
  } catch {
    return NextResponse.json(
      { error: 'service_unavailable', retryAfter: 30 },
      { status: 503 },
    )
  }
}
