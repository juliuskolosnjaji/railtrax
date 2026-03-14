import { config } from 'dotenv'
config({ path: '.env.local' })

import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null

async function main() {
  // Scan for all formation:* keys and delete them
  let cursor = 0
  let deleted = 0

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: 'formation:*', count: 100 })
    cursor = Number(nextCursor)

    if (keys.length > 0) {
      await redis.del(...keys)
      deleted += keys.length
      console.log(`Deleted ${keys.length} keys:`, keys)
    }
  } while (cursor !== 0)

  console.log(`\nTotal deleted: ${deleted} formation cache entries`)
  process.exit(0)
}

main().catch(console.error)
