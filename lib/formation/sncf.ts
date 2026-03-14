/**
 * SNCF formation source via Navitia API.
 * Endpoint: GET https://api.navitia.io/v1/coverage/sncf/vehicle_journeys
 *           ?headsign={trainNumber}&since={ISO}&until={ISO+2h}
 *
 * Used for: TGV, OUIGO, TER, INOUI, INTERCITES, SNCF operator.
 * Register for free at https://navitia.io (3000 req/day on free tier).
 * Store key as NAVITIA_API_KEY in env.
 * Auth: HTTP Basic — token as username, empty password: Basic base64("{token}:")
 *
 * Note: Navitia does not expose the specific trainset model (e.g. Duplex vs Euroduplex).
 * We use the physical_mode + line prefix to infer the series, then static data
 * enriches with amenities.
 */

import type { FormationResult, FormationLeg } from './types'

const BASE = 'https://api.navitia.io/v1/coverage/sncf'

// physical_mode → basic series info.
// Keys include both Navitia display names AND the raw mode codes embedded in trip.id
// (last colon segment, e.g. "SNCF:2026-03-14:6107:1187:LongDistanceTrain" → "LongDistanceTrain").
const MODE_MAP: Record<string, { series: string; topSpeedKmh: number; hasWifi: boolean; hasBistro: boolean }> = {
  // trip.id codes (preferred — reliably present)
  'LongDistanceTrain':       { series: 'TGV',           topSpeedKmh: 320, hasWifi: true,  hasBistro: true  },
  'NightTrain':              { series: 'Train de nuit', topSpeedKmh: 200, hasWifi: false, hasBistro: false },
  'InterregionalTrain':      { series: 'Intercités',    topSpeedKmh: 200, hasWifi: false, hasBistro: true  },
  'LocalTrain':              { series: 'TER',           topSpeedKmh: 160, hasWifi: false, hasBistro: false },
  'RapidTransit':            { series: 'Transilien',    topSpeedKmh: 140, hasWifi: false, hasBistro: false },
  // Navitia display names (fallback — not always present on VJ objects)
  'Train grande vitesse':    { series: 'TGV',           topSpeedKmh: 320, hasWifi: true,  hasBistro: true  },
  'Train de nuit':           { series: 'Train de nuit', topSpeedKmh: 200, hasWifi: false, hasBistro: false },
  'Intercités':              { series: 'Intercités',    topSpeedKmh: 200, hasWifi: false, hasBistro: true  },
  'TER':                     { series: 'TER',           topSpeedKmh: 160, hasWifi: false, hasBistro: false },
}

// Line prefix overrides — map the first word of lineName to a more specific series
const PREFIX_OVERRIDE: Record<string, string> = {
  'OUIGO':      'OUIGO (TGV Duplex)',
  'INOUI':      'TGV Inouï',
  'TGV':        'TGV Inouï',
  'INTERCITES': 'Intercités',
}

export async function sncfLookup(leg: FormationLeg): Promise<FormationResult | null> {
  const apiKey = process.env.NAVITIA_API_KEY
  if (!apiKey) return null

  const num = extractNumber(leg)
  if (!num) return null

  // Navitia Basic auth: token as username, empty password
  const basicAuth = Buffer.from(`${apiKey}:`).toString('base64')

  // Use full service-day window so the lookup works regardless of when it's called.
  // Navitia filters by when journeys are active — a narrow ±2h window misses trains
  // if the API is called after the train has already departed.
  const since = new Date(leg.plannedDeparture)
  since.setHours(4, 0, 0, 0)
  const until = new Date(leg.plannedDeparture)
  until.setHours(23, 59, 0, 0)

  const url = new URL(`${BASE}/vehicle_journeys`)
  url.searchParams.set('headsign', num)
  url.searchParams.set('since', since.toISOString().replace('.000Z', 'Z'))
  url.searchParams.set('until', until.toISOString().replace('.000Z', 'Z'))
  url.searchParams.set('count', '1')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'User-Agent': 'Railtripper/1.0',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    if (res.status === 404 || res.status === 400) return null
    throw new Error(`Navitia HTTP ${res.status}`)
  }

  const data = await res.json()
  const vj = data?.vehicle_journeys?.[0]
  if (!vj) return null

  // Physical mode is NOT in vj.physical_modes (undefined on VJ objects).
  // It's encoded as the last colon-segment of vj.trip.id:
  //   "SNCF:2026-03-14:6107:1187:LongDistanceTrain" → "LongDistanceTrain"
  const modeCode: string = vj?.trip?.id?.split(':').pop() ?? ''
  const modeInfo = MODE_MAP[modeCode] ?? Object.entries(MODE_MAP).find(([k]) =>
    modeCode.toLowerCase().includes(k.toLowerCase())
  )?.[1]

  // Check if lineName gives a more specific series
  const linePrefix = leg.lineName?.trim().match(/^([A-ZÖÜÄ]+)/i)?.[1]?.toUpperCase()
  const seriesOverride = linePrefix ? PREFIX_OVERRIDE[linePrefix] : undefined

  const series = seriesOverride ?? modeInfo?.series ?? modeCode ?? 'SNCF train'

  return {
    series,
    operator: 'SNCF',
    topSpeedKmh: modeInfo?.topSpeedKmh ?? null,
    hasWifi: modeInfo?.hasWifi ?? false,
    hasBistro: modeInfo?.hasBistro ?? false,
    hasBike: series.includes('TER') || series.includes('Intercités'),
    hasWheelchair: true,
    description: null,
    wikipediaUrl: null,
    imageUrl: null,
    source: 'sncf',
    trainName: null,
  }
}

function extractNumber(leg: FormationLeg): string | null {
  const src = leg.trainNumber ?? leg.lineName ?? ''
  return src.match(/\d+/)?.[0] ?? null
}
