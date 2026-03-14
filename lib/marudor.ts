/**
 * Marudor API client — DB trains only, server-side.
 * Returns the exact Baureihe + optional train name (e.g. "ICE 4 · Rheingau").
 * Cached 2h in Redis.
 *
 * API: https://marudor.de/api/reihung/v4/trainInfo/{trainNumber}?datetime={YYYYMMDDHHmm}
 */

import { redis } from '@/lib/redis'

export interface MarudorTrainInfo {
  /** Display name, e.g. "ICE 4 · Rheingau" */
  displayName: string
  /** Train type returned by Marudor, e.g. "ICE 4" */
  trainType: string
  /** Optional train name, e.g. "Rheingau" */
  trainName?: string
}

const MARUDOR_BASE = 'https://marudor.de/api'
const CACHE_TTL = 60 * 60 * 2 // 2 hours in seconds

function cacheKey(trainNumber: string, dateStr: string): string {
  return `marudor:${trainNumber}:${dateStr}`
}

function toDatetimeParam(date: Date): string {
  // Format: YYYYMMDDHHmm — Marudor expects UTC+1 (CET/CEST) but we approximate
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const mo = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const mi = pad(date.getMinutes())
  return `${y}${mo}${d}${h}${mi}`
}

/**
 * Fetch train composition info from Marudor for a DB train number.
 * @param trainNumber  Numeric train number, e.g. "521"
 * @param departure    Departure datetime (used to identify the correct run)
 */
export async function getMarudorTrainInfo(
  trainNumber: string,
  departure: Date,
): Promise<MarudorTrainInfo | null> {
  const dateStr = toDatetimeParam(departure)
  const key = cacheKey(trainNumber, dateStr)

  // Check cache
  const cached = await redis.get<MarudorTrainInfo>(key)
  if (cached) return cached

  try {
    const url = `${MARUDOR_BASE}/reihung/v4/trainInfo/${encodeURIComponent(trainNumber)}?datetime=${dateStr}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Railtripper/1.0 (contact: hi@railtripper.app)' },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      // 404 means Marudor doesn't have this train — not an error
      if (res.status === 404 || res.status === 400) return null
      throw new Error(`Marudor HTTP ${res.status}`)
    }

    const data = await res.json()

    // Marudor reihung response shape (v4):
    // { train: { type: string, name?: string, number: string }, ... }
    const train = data?.train
    if (!train?.type) return null

    const trainType: string = train.type // e.g. "ICE 4"
    const trainName: string | undefined = train.name || undefined // e.g. "Rheingau"
    const displayName = trainName ? `${trainType} · ${trainName}` : trainType

    const result: MarudorTrainInfo = { displayName, trainType, trainName }

    // Cache result (don't cache on error, already handled above)
    await redis.set(key, result, { ex: CACHE_TTL })

    return result
  } catch (err) {
    // Marudor is best-effort; never let it break the app
    console.error('[marudor] fetch error:', err)
    return null
  }
}
