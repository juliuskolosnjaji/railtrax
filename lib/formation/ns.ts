/**
 * NS (Dutch Railways) formation source.
 * Endpoint: GET https://gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein/{ritnummer}
 *
 * Used for: origin IBNR starts with 84 (Netherlands), or NS operator.
 * Register for free at https://apiportal.ns.nl — subscribe to "Ns-App" product.
 * Store key as NS_API_KEY in env.
 */

import type { FormationResult, FormationLeg } from './types'

const BASE = 'https://gateway.apiportal.ns.nl/virtual-train-api/api/v1'

// materieeldelen[].type codes returned by the individual /trein/{ritnummer} endpoint.
// Top-level data.type gives the service category (e.g. "ICE", "IC", "SPR").
const TYPE_MAP: Record<string, {
  series: string
  topSpeedKmh: number
  wikipediaUrl: string
}> = {
  // ICE (DB ICE operated on NS network)
  'ICE-3NEO':   { series: 'ICE 3 Velaro Neo',            topSpeedKmh: 320, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_3' },
  'ICE-3':      { series: 'ICE 3',                        topSpeedKmh: 300, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICE_3' },
  // NS Intercity
  'ICNG':       { series: 'NS Intercity New Generation',  topSpeedKmh: 200, wikipediaUrl: 'https://en.wikipedia.org/wiki/ICNG' },
  'VIRM4':      { series: 'NS VIRM-4 (Dubbeldekker)',     topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_VIRM' },
  'VIRM6':      { series: 'NS VIRM-6 (Dubbeldekker)',     topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_VIRM' },
  'VIRM':       { series: 'NS VIRM (Dubbeldekker)',       topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_VIRM' },
  'ICM3':       { series: "NS Intercity Mat. '93 (3-delig)",topSpeedKmh: 200, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_ICM' },
  'ICM4':       { series: "NS Intercity Mat. '93 (4-delig)",topSpeedKmh: 200, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_ICM' },
  'ICM':        { series: "NS Intercity Mat. '93",        topSpeedKmh: 200, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_ICM' },
  'DDZ4':       { series: 'NS DDZ-4 (Dubbeldekker)',      topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_DDZ' },
  'DDZ6':       { series: 'NS DDZ-6 (Dubbeldekker)',      topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_DDZ' },
  'DDZ':        { series: 'NS DDZ (Dubbeldekker)',         topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_DDZ' },
  // NS Sprinter
  'SNG 3':      { series: 'NS Sprinter New Generation 3', topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SNG' },
  'SNG 4':      { series: 'NS Sprinter New Generation 4', topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SNG' },
  'SNG':        { series: 'NS Sprinter New Generation',   topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SNG' },
  'SLT4':       { series: 'NS Sprinter Light Train 4',    topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SLT' },
  'SLT6':       { series: 'NS Sprinter Light Train 6',    topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SLT' },
  'SLT':        { series: 'NS Sprinter Light Train',      topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SLT' },
  'SGM2':       { series: 'NS Sprinter SGM-2',            topSpeedKmh: 140, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SGM' },
  'SGM3':       { series: 'NS Sprinter SGM-3',            topSpeedKmh: 140, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SGM' },
  'SGM':        { series: 'NS Sprinter (SGM)',             topSpeedKmh: 140, wikipediaUrl: 'https://en.wikipedia.org/wiki/NS_SGM' },
  'FLIRT3':     { series: 'NS FLIRT3 (SNG)',               topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_FLIRT' },
  'FLIRT':      { series: 'NS FLIRT (SNG)',                topSpeedKmh: 160, wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_FLIRT' },
}

export async function nsLookup(leg: FormationLeg): Promise<FormationResult | null> {
  const apiKey = process.env.NS_API_KEY
  if (!apiKey) return null

  const num = extractNumber(leg)
  if (!num) return null

  const url = `${BASE}/trein/${encodeURIComponent(num)}`

  const res = await fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'User-Agent': 'Railtrax/1.0',
    },
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    // 404/400 = train not found; 500 = NS server error for unknown ritnummer — all are null
    if (res.status === 404 || res.status === 400 || res.status >= 500) return null
    throw new Error(`NS API HTTP ${res.status}`)
  }

  const data = await res.json()

  // Individual endpoint structure:
  //   { type: "ICE", materieeldelen: [{ type: "ICE-3NEO", faciliteiten: ["WIFI",...], ... }] }
  // materieeldelen[].type is a plain string (not an object with omschrijving).
  // faciliteiten is an array of strings: "WIFI", "FIETS", "STILTE", "TOILET", "STROOM", etc.
  const parts: { type?: string; faciliteiten?: string[] }[] = data?.materieeldelen ?? []
  const rawType: string = parts[0]?.type ?? ''
  const typeCode = rawType.trim()  // e.g. "ICE-3NEO", "SNG 3", "VIRM4"

  // Extract amenities directly from faciliteiten (more reliable than TYPE_MAP guesses)
  const faciliteiten: string[] = parts.flatMap(p => p.faciliteiten ?? [])

  if (!typeCode) return null

  const known = TYPE_MAP[typeCode] ?? findByPrefix(typeCode)

  return {
    series: known?.series ?? typeCode,
    operator: 'NS',
    topSpeedKmh: known?.topSpeedKmh ?? null,
    // Prefer faciliteiten from the API; fall back to TYPE_MAP static values
    hasWifi: faciliteiten.includes('WIFI'),
    hasBistro: faciliteiten.includes('BISTRO') || faciliteiten.includes('RESTAURANT'),
    hasBike: faciliteiten.includes('FIETS'),
    hasWheelchair: faciliteiten.includes('TOEGANKELIJK') || true,
    description: null,
    wikipediaUrl: known?.wikipediaUrl ?? null,
    imageUrl: null,
    source: 'ns',
    trainName: null,
  }
}

// Match on longest prefix, e.g. "ICE-3NEO-UNKNOWN" → "ICE-3NEO" → "ICE-3" → "ICE"
function findByPrefix(code: string) {
  // Try exact match first, then progressively strip trailing segments
  const keys = Object.keys(TYPE_MAP).sort((a, b) => b.length - a.length)
  return keys.find(k => code.startsWith(k) || code.includes(k))
    ? TYPE_MAP[keys.find(k => code.startsWith(k) || code.includes(k))!]
    : null
}

function extractNumber(leg: FormationLeg): string | null {
  const src = leg.trainNumber ?? leg.lineName ?? ''
  return src.match(/\d+/)?.[0] ?? null
}
