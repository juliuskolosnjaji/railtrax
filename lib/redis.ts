import { Redis } from '@upstash/redis'

// Upstash Redis client — null when env vars are not set (local dev without Redis).
// The REST client is HTTP-based so it's safe to instantiate at module level
// in serverless/edge runtimes.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

/**
 * Read-through cache helper.
 * Returns the cached value if present, otherwise calls fn(), stores the result
 * for ttlSeconds, and returns it.
 * If Redis is not configured the cache is bypassed silently.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  if (!redis) return fn()

  const hit = await redis.get<T>(key)
  if (hit !== null) return hit

  const value = await fn()
  // Fire-and-forget: don't let a cache write failure block the response
  redis.set(key, value, { ex: ttlSeconds }).catch(() => {})
  return value
}
