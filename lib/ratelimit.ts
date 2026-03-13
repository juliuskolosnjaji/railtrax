import { Ratelimit } from '@upstash/ratelimit'
import { NextResponse } from 'next/server'
import { redis } from './redis'

// 30 requests per user per minute on all /api/search/* endpoints.
// null when Redis is not configured — rate-limit check is bypassed (dev/test).
const searchLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'rl:search',
    })
  : null

/**
 * Check the per-user rate limit for search endpoints.
 * Returns a 503 NextResponse if the limit is exceeded, null if ok.
 * The caller should return the response immediately if it is non-null:
 *
 *   const limited = await checkSearchRateLimit(user.id)
 *   if (limited) return limited
 */
export async function checkSearchRateLimit(userId: string): Promise<NextResponse | null> {
  if (!searchLimiter) return null

  const { success, reset } = await searchLimiter.limit(userId)
  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    return NextResponse.json(
      { error: 'service_unavailable', retryAfter },
      { status: 503, headers: { 'Retry-After': String(retryAfter) } },
    )
  }
  return null
}
