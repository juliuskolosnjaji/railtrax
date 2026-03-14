/**
 * Marudor formation source — Deutsche Bahn, no API key.
 * Endpoint: GET https://marudor.de/api/reihung/v4/formation/{trainNumber}/{timestampMs}
 *
 * Used for: ICE, IC, EC, EN, NJ (DB-operated legs)
 */

import type { FormationResult, FormationLeg } from './types'

const BASE = 'https://marudor.de/api/reihung/v4'

// BR number → human-readable series + amenities
const BAUREIHE: Record<string, {
  series: string
  topSpeedKmh: number
  hasWifi: boolean
  hasBistro: boolean
  hasBike: boolean
  wikipediaUrl: string
}> = {
  '401': { series: 'ICE 1',           topSpeedKmh: 280, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_1' },
  '402': { series: 'ICE 2',           topSpeedKmh: 280, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_2' },
  '403': { series: 'ICE 3',           topSpeedKmh: 330, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_3' },
  '406': { series: 'ICE 3 (Velaro)',  topSpeedKmh: 300, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_3' },
  '407': { series: 'ICE 3 Neo',       topSpeedKmh: 320, hasWifi: true,  hasBistro: true,  hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/Siemens_Velaro_MS' },
  '408': { series: 'ICE 3 Neo',       topSpeedKmh: 320, hasWifi: true,  hasBistro: true,  hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/Siemens_Velaro_MS' },
  '411': { series: 'ICE-T',           topSpeedKmh: 230, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_T' },
  '412': { series: 'ICE 4',           topSpeedKmh: 250, hasWifi: true,  hasBistro: true,  hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_4' },
  '415': { series: 'ICE-T',           topSpeedKmh: 230, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_T' },
  '440': { series: 'Coradia Continental', topSpeedKmh: 160, hasWifi: false, hasBistro: false, hasBike: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/Alstom_Coradia_Continental' },
  '445': { series: 'IC2 (Twindexx)', topSpeedKmh: 160, hasWifi: true,  hasBistro: false, hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/Bombardier_Twindexx' },
  '446': { series: 'IC2 (KISS)',      topSpeedKmh: 160, hasWifi: true,  hasBistro: false, hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_KISS' },
}

export async function marudorLookup(leg: FormationLeg): Promise<FormationResult | null> {
  const num = extractNumber(leg)
  if (!num) return null

  const timestampMs = leg.plannedDeparture.getTime()
  const url = `${BASE}/formation/${encodeURIComponent(num)}/${timestampMs}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Railtrax/1.0' },
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    if (res.status === 404 || res.status === 400) return null
    throw new Error(`Marudor HTTP ${res.status}`)
  }

  const data = await res.json()
  const train = data?.train

  if (!train) return null

  const trainName: string | null = train.name ?? null

  // Derive baureihe from first coach group if present
  const br: string | null = data?.coaches?.[0]?.type?.baureihe ?? null
  const knownBr = br ? BAUREIHE[br] : null

  const series = knownBr?.series ?? train.type ?? 'DB train'

  return {
    series: trainName ? `${series} · ${trainName}` : series,
    operator: 'DB',
    topSpeedKmh: knownBr?.topSpeedKmh ?? null,
    hasWifi: knownBr?.hasWifi ?? true,
    hasBistro: knownBr?.hasBistro ?? false,
    hasBike: knownBr?.hasBike ?? false,
    hasWheelchair: true,
    description: null,
    wikipediaUrl: knownBr?.wikipediaUrl ?? null,
    imageUrl: null,
    source: 'marudor',
    trainName,
  }
}

function extractNumber(leg: FormationLeg): string | null {
  const src = leg.trainNumber ?? leg.lineName ?? ''
  return src.match(/\d+/)?.[0] ?? null
}
