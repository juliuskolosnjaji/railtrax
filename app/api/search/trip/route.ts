import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await checkSearchRateLimit(user.id)
  if (limited) return limited

  const tripId = req.nextUrl.searchParams.get('tripId') ?? ''
  if (!tripId) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const trip = await getTripById(tripId)
    if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ data: trip })
  } catch {
    return NextResponse.json(
      { error: 'service_unavailable', retryAfter: 30 },
      { status: 503 },
    )
  }
}
