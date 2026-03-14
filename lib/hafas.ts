/**
 * DB Vendo client — server-side only.
 * db-vendo-client is ESM-only; excluded from webpack via serverExternalPackages
 * in next.config.mjs so it can be loaded natively at runtime.
 *
 * Migrated from db-hafas (old HAFAS API permanently shut down by DB).
 * Uses the dbnav profile (DB Navigator API) — best balance of data quality
 * and rate limits. withRetrying handles transient errors automatically.
 */

import type { HafasStation, HafasDeparture, HafasJourney, HafasStopover } from './hafas-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _scanClient: any = null

// Main client — withRetrying for reliable single fetches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClient(): Promise<any> {
  if (!_client) {
    const { createClient } = await import('db-vendo-client')
    const { withRetrying } = await import('db-vendo-client/retry.js')
    const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js')
    _client = createClient(withRetrying(dbnavProfile), 'railtrax/1.0')
  }
  return _client
}

// Scan client — no retrying so failed board slots are skipped immediately.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getScanClient(): Promise<any> {
  if (!_scanClient) {
    const { createClient } = await import('db-vendo-client')
    const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js')
    _scanClient = createClient(dbnavProfile, 'railtrax/1.0')
  }
  return _scanClient
}

// Warm the scan client connection so the first real search call is fast.
// Called once from the first searchStations() which is always invoked before
// the user can trigger a train-number search.
let _scanClientWarmed = false
async function warmScanClient() {
  if (_scanClientWarmed) return
  _scanClientWarmed = true
  const c = await getScanClient()
  c.locations('Frankfurt', { results: 1, stops: true, addresses: false, poi: false }).catch(() => {})
}

// Shared product filter — trains only, no bus/ferry/urban transit
const TRAIN_PRODUCTS = {
  nationalExpress: true,
  national: true,
  regionalExpress: true,
  regional: true,
  suburban: true,
  bus: false,
  ferry: false,
  subway: false,
  tram: false,
  taxi: false,
}

// For hub-based train-number search we skip suburban to reduce noise
const LONG_DISTANCE_PRODUCTS = {
  nationalExpress: true,
  national: true,
  regionalExpress: true,
  regional: true,
  suburban: false,
  bus: false,
  ferry: false,
  subway: false,
  tram: false,
  taxi: false,
}

/**
 * Try to fetch the GeoJSON polyline for a train leg.
 * Returns null if anything fails — caller renders a straight line instead.
 */
export async function fetchPolyline(
  originIbnr: string,
  plannedDeparture: Date,
  trainNumber: string,
): Promise<[number, number][] | null> {
  try {
    const client = await getClient()

    const { departures } = await client.departures(originIbnr, {
      when: plannedDeparture,
      duration: 10,
      results: 30,
      products: TRAIN_PRODUCTS,
    })

    const normalised = trainNumber.replace(/\s+/g, '').toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = (departures as any[]).find((dep: any) => {
      if (!dep.tripId || dep.cancelled) return false
      const lineName = (dep.line?.name ?? '').replace(/\s+/g, '').toLowerCase()
      const fahrtNr = (dep.line?.fahrtNr ?? '').replace(/\s+/g, '').toLowerCase()
      return lineName === normalised || fahrtNr === normalised
    })

    if (!match?.tripId) return null

    const { trip } = await client.trip(match.tripId, { polyline: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features: any[] = trip?.polyline?.features ?? []
    if (!features.length) return null

    const coords: [number, number][] = features
      .filter((f: { geometry?: { type?: string } }) => f.geometry?.type === 'Point')
      .map((f: { geometry: { coordinates: [number, number] } }) => f.geometry.coordinates)

    return coords.length >= 2 ? coords : null
  } catch {
    return null
  }
}

/**
 * Search for stations by query string.
 */
export async function searchStations(query: string): Promise<HafasStation[]> {
  warmScanClient() // fire-and-forget warm-up; no await
  const client = await getClient()
  const locations = await client.locations(query, {
    results: 8,
    stops: true,
    addresses: false,
    poi: false,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (locations as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => l.type === 'stop' || l.type === 'station')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any): HafasStation => ({
      id: l.id,
      name: l.name,
      lat: l.location?.latitude ?? undefined,
      lon: l.location?.longitude ?? undefined,
    }))
}

/**
 * Get departures from a station (IBNR) at a given datetime.
 */
export async function getDepartures(ibnr: string, datetime: Date): Promise<HafasDeparture[]> {
  const client = await getClient()
  const { departures } = await client.departures(ibnr, {
    when: datetime,
    duration: 30,
    results: 30,
    products: TRAIN_PRODUCTS,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (departures as any[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((d: any) => !d.cancelled && d.tripId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((d: any): HafasDeparture => ({
      tripId: d.tripId,
      lineName: d.line?.name ?? '',
      direction: d.direction ?? '',
      platform: d.platform ?? null,
      plannedWhen: d.plannedWhen ?? d.when ?? '',
      delay: d.delay ?? 0,
      cancelled: d.cancelled ?? false,
      operator: d.line?.operator?.name ?? null,
    }))
}

/**
 * Get full journey (stopovers + polyline) for a tripId.
 */
export async function getJourney(tripId: string): Promise<HafasJourney> {
  const client = await getClient()
  const { trip } = await client.trip(tripId, { stopovers: true, polyline: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stopovers: HafasStopover[] = (trip.stopovers as any[] ?? []).map((s: any): HafasStopover => ({
    stationId: s.stop?.id ?? '',
    stationName: s.stop?.name ?? '',
    lat: s.stop?.location?.latitude ?? null,
    lon: s.stop?.location?.longitude ?? null,
    plannedArrival: s.plannedArrival ?? null,
    plannedDeparture: s.plannedDeparture ?? null,
    delay: s.departureDelay ?? s.arrivalDelay ?? 0,
    platform: s.platform ?? null,
    cancelled: s.cancelled ?? false,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features: any[] = trip?.polyline?.features ?? []
  let polyline: [number, number][] | null = null
  if (features.length) {
    const coords: [number, number][] = features
      .filter((f: { geometry?: { type?: string } }) => f.geometry?.type === 'Point')
      .map((f: { geometry: { coordinates: [number, number] } }) => f.geometry.coordinates)
    polyline = coords.length >= 2 ? coords : null
  }

  return {
    tripId: trip.id,
    lineName: trip.line?.name ?? '',
    operator: trip.line?.operator?.name ?? null,
    stopovers,
    polyline,
  }
}

/**
 * Find a journey by train number.
 *
 * The dbnav board returns ~30 results per ~1-hour window and the server
 * serialises concurrent requests from the same connection, so parallel calls
 * are no faster than sequential ones. Instead we scan sequentially with an
 * early exit: once a matching departure is found we stop immediately.
 *
 * Search order: Frankfurt first (passes through most ICE/IC), then Berlin.
 * Within each hub we start at the statistically busiest hours and expand
 * outward, so most trains are found in 1–3 calls (~300–900 ms total).
 */
const SCAN_HUBS = [
  '8000105', // Frankfurt Hbf — central node for all N/S and E/W axes
  '8011160', // Berlin Hbf    — main terminus for northern/eastern trains
]

// Most ICE/IC trains run 06:00–22:00; start there and expand outward
const SCAN_HOURS = [9, 12, 15, 6, 18, 21, 3, 0]

export async function getJourneyByTrainNumber(
  trainNumber: string,
  date: Date,
): Promise<HafasJourney | null> {
  const scanClient = await getScanClient()
  const normalised = trainNumber.replace(/\s+/g, '').toLowerCase()

  for (const hubId of SCAN_HUBS) {
    for (const hour of SCAN_HOURS) {
      const when = new Date(date)
      when.setHours(hour, 0, 0, 0)

      try {
        const { departures } = await scanClient.departures(hubId, {
          when,
          duration: 60,
          results: 50,
          products: LONG_DISTANCE_PRODUCTS,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = (departures as any[]).find((dep: any) => {
          if (!dep.tripId || dep.cancelled) return false
          const lineName = (dep.line?.name ?? '').replace(/\s+/g, '').toLowerCase()
          return lineName === normalised
        })

        if (match?.tripId) return getJourney(match.tripId)
      } catch {
        // slot failed — continue to next
      }
    }
  }

  return null
}
