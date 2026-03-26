import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchStations } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rateLimitKey = user?.id ?? req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anon'
  const limited = await checkSearchRateLimit(rateLimitKey)
  if (limited) return limited

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ data: [] })

  const cacheKey = `station-search:${q.toLowerCase()}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json({ data: cached })
    }
  } catch (e) {
    console.warn('Redis read error (non-fatal):', e)
  }

  try {
    const stations = await searchStations(q)

    try {
      await redis.setex(cacheKey, 86400, stations)
    } catch (e) {
      console.warn('Redis write error (non-fatal):', e)
    }

    return NextResponse.json({ data: stations })
  } catch {
    return NextResponse.json(
      { error: 'service_unavailable', retryAfter: 30 },
      { status: 503 },
    )
  }
}
