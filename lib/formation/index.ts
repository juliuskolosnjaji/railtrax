/**
 * Formation orchestrator — single entrypoint for rolling stock lookup.
 *
 * Priority (first non-null wins):
 *   1. Redis cache
 *   2. Live source matched by operator / IBNR country prefix
 *   3. Static lookup (always available for known train categories)
 *
 * All live sources fail silently — missing formation data never breaks the UI.
 * Results are cached 6h in Redis.
 */

import { redis } from '@/lib/redis'
import { marudorLookup } from './marudor'
import { swissOtdLookup } from './swissOtd'
import { nsLookup } from './ns'
import { sncfLookup } from './sncf'
import { staticLookup } from './static'
// RTT (UK) — not yet configured, skip
// TODO: add RTT_USERNAME + RTT_PASSWORD when available, then re-enable rttLookup
import type { FormationResult, FormationLeg } from './types'

export type { FormationResult, FormationLeg }

const CACHE_TTL = 60 * 60 * 6 // 6 hours

function buildCacheKey(leg: FormationLeg): string {
  const date = leg.plannedDeparture.toISOString().slice(0, 10)
  const id = leg.lineName ?? leg.trainNumber ?? 'unknown'
  return `formation:${id}:${date}`
}

// Extract the alphabetic prefix from lineName or trainNumber, e.g. "ICE 521" → "ICE"
function linePrefix(leg: FormationLeg): string | null {
  const src = leg.lineName ?? leg.trainNumber ?? ''
  return src.trim().match(/^([A-ZÖÜÄa-zöüä]+)/)?.[1]?.toUpperCase() ?? null
}

// First two digits of origin IBNR are the country code
function ibnrCountry(leg: FormationLeg): string | null {
  return leg.originIbnr?.slice(0, 2) ?? null
}

export async function getFormation(leg: FormationLeg): Promise<FormationResult | null> {
  const cacheKey = buildCacheKey(leg)

  // 1. Cache check
  const cached = await redis.get<FormationResult>(cacheKey)
  if (cached) return cached

  const prefix = linePrefix(leg)
  const country = ibnrCountry(leg)
  const op = leg.operator?.toUpperCase() ?? ''

let result: FormationResult | null = null

  // 2. Live source selection
  try {
    if (
      prefix && ['ICE', 'IC', 'EC', 'EN', 'NJ'].includes(prefix) &&
      (op.includes('DB') || op.includes('FERNVERKEHR') || country === '80')
    ) {
      result = await marudorLookup(leg)
    } else if (
      country === '85' ||
      op.includes('SBB') || op.includes('CFF') || op.includes('FFS')
    ) {
      result = await swissOtdLookup(leg)
    } else if (
      country === '84' ||
      op.includes('NS ') || op === 'NS'
    ) {
      result = await nsLookup(leg)
    } else if (
      (prefix && ['TGV', 'OUIGO', 'INOUI', 'TER', 'INTERCITES'].includes(prefix)) ||
      op.includes('SNCF')
    ) {
      result = await sncfLookup(leg)
    }
    // RTT (UK) — TODO: enable when RTT_USERNAME + RTT_PASSWORD are available
    // else if (country === '70') { result = await rttLookup(leg) }
  } catch (err) {
    console.warn('[formation] live source error, falling back to static:', err)
    result = null
  }

  // 3. Static fallback
  if (!result) {
    result = staticLookup(leg)
  }

  // 4. Cache and return
  if (result) {
    await redis.set(cacheKey, result, { ex: CACHE_TTL })
  }

  return result
}
