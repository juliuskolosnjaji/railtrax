import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchJourneys } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rateLimitKey = user?.id ?? req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anon'
  const limited = await checkSearchRateLimit(rateLimitKey)
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
  const via = req.nextUrl.searchParams.get('via') ?? undefined
  const bike = req.nextUrl.searchParams.get('bike') === 'true'
  const maxTransfersStr = req.nextUrl.searchParams.get('maxTransfers')
  const maxTransfers = maxTransfersStr ? parseInt(maxTransfersStr, 10) : undefined
  const onlyLongDistance = req.nextUrl.searchParams.get('onlyLongDistance') === 'true'

  try {
    const journeys = await searchJourneys(from, to, datetime, travelClass, {
      viaIbnr: via,
      bike: bike || undefined,
      maxTransfers,
      onlyLongDistance: onlyLongDistance || undefined,
    })
    return NextResponse.json({ data: journeys })
  } catch {
    return NextResponse.json(
      { error: 'service_unavailable', retryAfter: 30 },
      { status: 503 },
    )
  }
}
