/**
 * GET /api/v1/search?from=&to=&datetime=&class=2
 * Search for train connections between two stations.
 * Requires authentication (Bearer token).
 */
import { NextRequest } from 'next/server'
import { authenticateRequest, v1Ok, v1Error } from '@/lib/api/v1/middleware'
import { searchJourneys } from '@/lib/vendo'
import { checkSearchRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (auth.response) return auth.response

  const limited = await checkSearchRateLimit(auth.userId)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const datetimeStr = searchParams.get('datetime') ?? ''
  const classParam = searchParams.get('class') ?? '2'

  if (!from || !to || !datetimeStr) {
    return v1Error('Missing required params: from, to, datetime', 400, 'bad_request')
  }

  const datetime = new Date(datetimeStr)
  if (isNaN(datetime.getTime())) {
    return v1Error('Invalid datetime format', 400, 'bad_request')
  }

  try {
    const journeys = await searchJourneys(from, to, datetime, classParam === '1' ? 1 : 2)
    return v1Ok(journeys)
  } catch {
    return v1Error('Search service unavailable', 503, 'service_unavailable')
  }
}
