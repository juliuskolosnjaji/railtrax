import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchJourneys } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await checkSearchRateLimit(user.id)
  if (limited) return limited

  const from = req.nextUrl.searchParams.get('from') ?? ''
  const to = req.nextUrl.searchParams.get('to') ?? ''
  const datetimeStr = req.nextUrl.searchParams.get('datetime') ?? ''
  const classParam = req.nextUrl.searchParams.get('class') ?? '2'

  if (!from || !to || !datetimeStr) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const datetime = new Date(datetimeStr)
  if (isNaN(datetime.getTime())) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const travelClass = classParam === '1' ? 1 : 2

  try {
    const journeys = await searchJourneys(from, to, datetime, travelClass)
    return NextResponse.json({ data: journeys })
  } catch {
    return NextResponse.json(
      { error: 'service_unavailable', retryAfter: 30 },
      { status: 503 },
    )
  }
}
