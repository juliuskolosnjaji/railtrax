/**
 * Swiss Open Transport Data formation source — SBB and other Swiss operators.
 * Endpoint: GET https://api.opentransportdata.swiss/formation/v1/formations_vehicle_based
 *           ?operationDate=YYYY-MM-DD&trainNumber={num}&evu={EVU}
 *
 * The `evu` param is required — without it the API returns 403.
 * Supported EVU codes: SBBP (SBB), BLSP (BLS), SOB, RhB, THURBO, TPF, MBC.
 *
 * Vehicle type is in formationVehicles[].vehicleIdentifier.typeCodeName,
 * formatted as "[carType]([UIC series number])", e.g. "Bt1(501)" → RABe 501 = Giruno.
 *
 * Register at: https://api-manager.opentransportdata.swiss → Formation Service.
 * Store token as SWISS_OTD_API_KEY in env.
 */

import type { FormationResult, FormationLeg } from './types'

const BASE = 'https://api.opentransportdata.swiss/formation/v1'

// UIC series number (from typeCodeName parentheses) → rolling stock info
const SERIES_MAP: Record<string, {
  series: string
  topSpeedKmh: number
  hasWifi: boolean
  hasBistro: boolean
  hasBike: boolean
  hasWheelchair: boolean
  wikipediaUrl: string
}> = {
  '501':  { series: 'SBB Giruno (RABe 501)',        topSpeedKmh: 250, hasWifi: true,  hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/RABe_501' },
  '503':  { series: 'SBB Astoro (RABe 503)',         topSpeedKmh: 200, hasWifi: true,  hasBistro: true,  hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/Alstom_ETR_610' },
  '511':  { series: 'SBB KISS (RABe 511)',           topSpeedKmh: 200, hasWifi: true,  hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_KISS' },
  '512':  { series: 'SBB KISS (RABe 512)',           topSpeedKmh: 200, hasWifi: true,  hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_KISS' },
  '514':  { series: 'SBB DOSTO (RABe 514)',          topSpeedKmh: 160, hasWifi: false, hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/RABe_514' },
  '522':  { series: 'SBB FLIRT (RABe 522)',          topSpeedKmh: 160, hasWifi: false, hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_FLIRT' },
  '523':  { series: 'SBB FLIRT 3 (RABe 523)',        topSpeedKmh: 160, hasWifi: false, hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_FLIRT' },
  '524':  { series: 'SBB FLIRT 3 (RABe 524)',        topSpeedKmh: 160, hasWifi: false, hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/Stadler_FLIRT' },
  '500':  { series: 'SBB ICN (RABDe 500)',           topSpeedKmh: 200, hasWifi: true,  hasBistro: true,  hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/RABDe_500' },
  // IC2000 push-pull: locomotive Re 460 + IC2000 coaches
  '460':  { series: 'SBB IC2000 (Re 460)',           topSpeedKmh: 200, hasWifi: true,  hasBistro: true,  hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/SBB-CFF-FFS_IC2000' },
  // BLS
  '535':  { series: 'BLS MIKA (RABe 535)',           topSpeedKmh: 160, hasWifi: true,  hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/RABe_535' },
  '528':  { series: 'BLS MIKA (RABe 528)',           topSpeedKmh: 160, hasWifi: true,  hasBistro: false, hasBike: true,  hasWheelchair: true, wikipediaUrl: 'https://en.wikipedia.org/wiki/RABe_535' },
}

// Operator name → EVU code for the API
const OPERATOR_EVU: Record<string, string> = {
  'SBB':     'SBBP',
  'BLS':     'BLSP',
  'SOB':     'SOB',
  'RhB':     'RhB',
  'THURBO':  'THURBO',
  'TPF':     'TPF',
  'MBC':     'MBC',
}

export async function swissOtdLookup(leg: FormationLeg): Promise<FormationResult | null> {
  const apiKey = process.env.SWISS_OTD_API_KEY
  if (!apiKey) return null

  const num = extractNumber(leg)
  if (!num) return null

  // Determine EVU from operator — default to SBBP (most Swiss IC/IR trains)
  const evu = resolveEvu(leg.operator) ?? 'SBBP'

  const operationDate = leg.plannedDeparture.toISOString().slice(0, 10)
  const url = new URL(`${BASE}/formations_vehicle_based`)
  url.searchParams.set('operationDate', operationDate)
  url.searchParams.set('trainNumber', num)
  url.searchParams.set('evu', evu)

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'Railtrax/1.0',
      accept: 'application/json',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    // 400/404 = no data for this train; 403 = wrong EVU or scope issue — all silent fallback
    if (res.status === 400 || res.status === 404 || res.status === 403) return null
    throw new Error(`SwissOTD HTTP ${res.status}`)
  }

  const data = await res.json()

  // formations[0].formationVehicles[0].vehicleIdentifier.typeCodeName = "Bt1(501)"
  const vehicles: { vehicleIdentifier?: { typeCodeName?: string } }[] =
    data?.formations?.[0]?.formationVehicles ?? []

  // Extract the UIC series number from the first vehicle's typeCodeName
  const seriesNum = extractSeriesNumber(vehicles)
  if (!seriesNum) return null

  const known = SERIES_MAP[seriesNum]

  return {
    series: known?.series ?? `UIC ${seriesNum}`,
    operator: resolveOperatorName(leg.operator),
    topSpeedKmh: known?.topSpeedKmh ?? null,
    hasWifi: known?.hasWifi ?? false,
    hasBistro: known?.hasBistro ?? false,
    hasBike: known?.hasBike ?? true,
    hasWheelchair: known?.hasWheelchair ?? true,
    description: null,
    wikipediaUrl: known?.wikipediaUrl ?? null,
    imageUrl: null,
    source: 'swiss-otd',
    trainName: null,
  }
}

// "Bt1(501)" → "501", "WR(0)" → "0", "A(460)" → "460"
function extractSeriesNumber(
  vehicles: { vehicleIdentifier?: { typeCodeName?: string } }[]
): string | null {
  for (const v of vehicles) {
    const name = v.vehicleIdentifier?.typeCodeName ?? ''
    const m = name.match(/\((\d+)\)/)
    if (m && m[1] !== '0') return m[1]
  }
  return null
}

function resolveEvu(operator: string | null): string | null {
  if (!operator) return null
  const upper = operator.toUpperCase()
  for (const [key, evu] of Object.entries(OPERATOR_EVU)) {
    if (upper.includes(key.toUpperCase())) return evu
  }
  return null
}

function resolveOperatorName(operator: string | null): string {
  if (!operator) return 'SBB'
  const upper = operator.toUpperCase()
  if (upper.includes('BLS')) return 'BLS'
  if (upper.includes('SOB')) return 'SOB'
  if (upper.includes('RHB') || upper.includes('RHÄ')) return 'RhB'
  return 'SBB'
}

function extractNumber(leg: FormationLeg): string | null {
  const src = leg.trainNumber ?? leg.lineName ?? ''
  return src.match(/\d+/)?.[0] ?? null
}
