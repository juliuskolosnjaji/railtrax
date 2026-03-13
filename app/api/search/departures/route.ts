import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDepartures } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await checkSearchRateLimit(user.id)
  if (limited) return limited

  const ibnr = req.nextUrl.searchParams.get('ibnr') ?? ''
  const whenStr = req.nextUrl.searchParams.get('when') ?? ''
  if (!ibnr || !whenStr) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const when = new Date(whenStr)
  if (isNaN(when.getTime())) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const departures = await getDepartures(ibnr, when)
    return NextResponse.json({ data: departures })
  } catch {
    return NextResponse.json(
      { error: 'service_unavailable', retryAfter: 30 },
      { status: 503 },
    )
  }
}
