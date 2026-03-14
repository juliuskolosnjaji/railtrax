/**
 * Realtime Trains (RTT) formation source — Great Britain.
 * Endpoint: GET https://api.rtt.io/api/v1/json/service/{serviceUid}/{YYYY/MM/DD}
 * Auth: HTTP Basic with RTT_USERNAME + RTT_PASSWORD.
 *
 * Used for: origin IBNR starting with 70 (Great Britain).
 * Register for free at https://api.rtt.io (non-commercial use).
 * Store as RTT_USERNAME + RTT_PASSWORD in env.
 *
 * RTT uses service UIDs, not train numbers, so we first search departures at
 * the origin station to find the matching UID, then fetch the full service.
 */

import type { FormationResult, FormationLeg } from './types'

const BASE = 'https://api.rtt.io/api/v1/json'

// Operator ATOC code + coach count heuristics → rolling stock
const CLASS_MAP: Record<string, {
  series: string
  topSpeedKmh: number
  hasWifi: boolean
  hasBistro: boolean
  hasBike: boolean
  wikipediaUrl: string
}> = {
  'LNER_LONG':   { series: 'LNER Azuma (Class 800)',      topSpeedKmh: 200, hasWifi: true,  hasBistro: true,  hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/British_Rail_Class_800' },
  'GWR_LONG':    { series: 'GWR IET (Class 800/802)',     topSpeedKmh: 200, hasWifi: true,  hasBistro: true,  hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/British_Rail_Class_802' },
  'AW_LONG':     { series: 'Avanti Pendolino (Class 390)',topSpeedKmh: 225, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/British_Rail_Class_390' },
  'ES_LONG':     { series: 'Eurostar e320 (Class 374)',   topSpeedKmh: 320, hasWifi: true,  hasBistro: true,  hasBike: false, wikipediaUrl: 'https://en.wikipedia.org/wiki/Class_374' },
  'DEFAULT_LONG':{ series: 'British IET (Class 800)',     topSpeedKmh: 200, hasWifi: true,  hasBistro: false, hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/British_Rail_Class_800' },
  'DEFAULT_MED': { series: 'British EMU',                 topSpeedKmh: 160, hasWifi: false, hasBistro: false, hasBike: true,  wikipediaUrl: 'https://en.wikipedia.org/wiki/Electric_multiple_unit' },
}

export async function rttLookup(leg: FormationLeg): Promise<FormationResult | null> {
  const username = process.env.RTT_USERNAME
  const password = process.env.RTT_PASSWORD
  if (!username || !password) return null

  const ibnr = leg.originIbnr
  if (!ibnr) return null

  // RTT uses CRS codes (3-letter), not IBNRs.
  // We can search by departure time at the station using the "search" endpoint
  // but we need the CRS code. Since we don't have a mapping, use station name
  // heuristic or bail — this is best-effort for UK trains.
  const crs = ibnrToCrs(ibnr)
  if (!crs) return null

  const dep = leg.plannedDeparture
  const dateStr = `${dep.getFullYear()}/${String(dep.getMonth() + 1).padStart(2, '0')}/${String(dep.getDate()).padStart(2, '0')}`
  const timeStr = `${String(dep.getHours()).padStart(2, '0')}${String(dep.getMinutes()).padStart(2, '0')}`

  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  // Step 1: find service UID
  const searchUrl = `${BASE}/search/${crs}/${dateStr}/${timeStr}`
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Basic ${auth}`, 'User-Agent': 'Railtrax/1.0' },
    signal: AbortSignal.timeout(5000),
  })
  if (!searchRes.ok) return null

  const searchData = await searchRes.json()
  const trainNum = extractNumber(leg)
  const services: { serviceUid?: string; trainIdentity?: string; atocCode?: string }[] =
    searchData?.services ?? []

  const match = services.find(s =>
    s.trainIdentity === trainNum || s.trainIdentity?.endsWith(trainNum ?? '')
  )
  if (!match?.serviceUid) return null

  // Step 2: fetch service details
  const svcUrl = `${BASE}/service/${match.serviceUid}/${dateStr}`
  const svcRes = await fetch(svcUrl, {
    headers: { Authorization: `Basic ${auth}`, 'User-Agent': 'Railtrax/1.0' },
    signal: AbortSignal.timeout(5000),
  })
  if (!svcRes.ok) return null

  const svc = await svcRes.json()
  const coaches: unknown[] = svc?.formation?.coaches ?? []
  const atoc = match.atocCode?.toUpperCase() ?? 'DEFAULT'

  // Derive rolling stock from coach count + operator
  const key = coachCountKey(atoc, coaches.length)
  const known = CLASS_MAP[key] ?? CLASS_MAP[`DEFAULT_${coaches.length >= 8 ? 'LONG' : 'MED'}`]

  return {
    series: known.series,
    operator: atoc,
    topSpeedKmh: known.topSpeedKmh,
    hasWifi: known.hasWifi,
    hasBistro: known.hasBistro,
    hasBike: known.hasBike,
    hasWheelchair: true,
    description: null,
    wikipediaUrl: known.wikipediaUrl,
    imageUrl: null,
    source: 'rtt',
    trainName: null,
  }
}

function coachCountKey(atoc: string, coaches: number): string {
  const size = coaches >= 8 ? 'LONG' : 'MED'
  return `${atoc}_${size}`
}

function extractNumber(leg: FormationLeg): string | null {
  if (leg.trainNumber) return leg.trainNumber
  const m = leg.lineName?.match(/\d+/)
  return m?.[0] ?? null
}

/**
 * Rough IBNR-prefix → CRS lookup for major UK termini.
 * 70xxxx = UK IBNRs but RTT uses CRS codes.
 * We can't do a full mapping here — this is best-effort for common stations.
 */
const IBNR_TO_CRS: Record<string, string> = {
  '7015400': 'LBG', // London Bridge
  '7015401': 'LBG',
  '7011014': 'EUS', // London Euston
  '7011005': 'KGX', // King's Cross
  '7011155': 'PAD', // Paddington
  '7015956': 'VIC', // Victoria
  '7015402': 'CST', // Charing Cross
  '7011017': 'WAT', // Waterloo
  '7011019': 'MYB', // Marylebone
  '7014001': 'MAN', // Manchester Piccadilly
  '7014002': 'LIV', // Liverpool Lime Street
  '7012001': 'BHM', // Birmingham New St
  '7009001': 'GLC', // Glasgow Central
  '7009002': 'EDB', // Edinburgh Waverley
}

function ibnrToCrs(ibnr: string): string | null {
  return IBNR_TO_CRS[ibnr] ?? null
}
