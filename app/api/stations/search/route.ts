import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchStations } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rateLimitKey = user?.id ?? req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anon'
  const limited = await checkSearchRateLimit(rateLimitKey)
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
