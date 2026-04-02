/**
 * DB Vendo client — server-side only. Never import in client components.
 *
 * Uses the dbnav profile (DB Navigator / bahn.de API).
 * withRetrying wraps transient HafasErrors automatically (3 retries, exp back-off).
 * All four public functions are Redis-cached to stay within rate limits.
 *
 * The old DB HAFAS endpoint (reiseauskunft.bahn.de) was permanently shut down
 * by Deutsche Bahn in 2025. db-vendo-client is the drop-in replacement.
 */

import { cached } from './redis'

// ─── Helper: Derive operator from IBNR country prefix ───────────────────────────
function deriveOperatorFromIbnr(ibnr: string | null): string | null {
  if (!ibnr) return null
  const prefix = ibnr.substring(0, 2)
  switch (prefix) {
    case '80': return 'DB'      // Germany
    case '85': return 'SBB'     // Switzerland
    case '81': return 'ÖBB'     // Austria
    case '87': return 'SNCF'    // France
    case '84': return 'NS'      // Netherlands
    case '88': return 'FS'      // Italy
    case '70': return 'NR'      // UK (National Rail)
    case '72': return 'VR'      // Finland
    case '74': return 'DSB'     // Denmark
    case '76': return 'SJ'      // Sweden
    case '78': return 'VY'      // Norway
    default: return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Station {
  id: string        // EVA / IBNR, e.g. "8000261"
  name: string
  lat: number | null
  lon: number | null
}

export interface Departure {
  tripId: string
  trainNumber: string       // "ICE 724"
  lineName: string          // same as trainNumber for long-distance
  direction: string         // final destination name
  plannedWhen: string       // ISO 8601
  actualWhen: string | null // ISO 8601; null before real-time data is available
  delayMinutes: number      // 0 if on time
  plannedPlatform: string | null
  actualPlatform: string | null
  cancelled: boolean
}

export interface VendoStop {
  name: string
  ibnr: string
  plannedArr: string | null   // ISO 8601
  actualArr: string | null
  plannedDep: string | null
  actualDep: string | null
  delayMinutes: number
  platform: string | null
}

export interface VendoTrip {
  tripId: string
  lineName: string
  operator: string | null
  stops: VendoStop[]
  polyline: { type: 'LineString'; coordinates: [number, number][] } | null
}

export interface Stop {
  name: string
  ibnr: string
  plannedArrival: string | null
  actualArrival: string | null
  plannedDeparture: string | null
  actualDeparture: string | null
  platform: string | null
  cancelled: boolean
}

export interface Stop {
  name: string
  ibnr: string
  plannedArrival: string | null
  actualArrival: string | null
  plannedDeparture: string | null
  actualDeparture: string | null
  platform: string | null
  cancelled: boolean
}

export interface JourneyLeg {
  origin: string
  originIbnr: string | null
  originLat: number | null
  originLon: number | null
  destination: string
  destinationIbnr: string | null
  destinationLat: number | null
  destinationLon: number | null
  departure: string         // ISO 8601 planned departure
  arrival: string           // ISO 8601 planned arrival
  operator: string | null
  trainNumber: string
  tripId: string | null
  delayMinutes: number
  platform: string | null
  stopovers: Stop[]
}

export interface Journey {
  legs: JourneyLeg[]
}

interface VendoLocation {
  id?: string
  name?: string
  type?: string
  location?: {
    latitude?: number
    longitude?: number
  }
}

interface VendoOperator {
  name?: string
}

interface VendoLine {
  name?: string
  fahrtNr?: string
  operator?: VendoOperator
}

interface VendoDepartureRecord {
  tripId?: string
  line?: VendoLine
  direction?: string
  plannedWhen?: string
  when?: string
  delay?: number
  plannedPlatform?: string
  platform?: string
  cancelled?: boolean
}

interface VendoStopoverRecord {
  stop?: VendoLocation
  plannedArrival?: string
  arrival?: string
  actualArrival?: string
  plannedDeparture?: string
  departure?: string
  actualDeparture?: string
  departureDelay?: number
  arrivalDelay?: number
  platform?: string
  plannedPlatform?: string
  cancelled?: boolean
}

interface VendoTripRecord {
  id?: string
  line?: VendoLine
  origin?: VendoLocation
  stopovers?: VendoStopoverRecord[]
  polyline?: {
    features?: Array<{
      geometry?: {
        type?: string
        coordinates?: [number, number]
      }
    }>
  }
}

interface VendoJourneyLegRecord {
  walking?: boolean
  line?: VendoLine
  origin?: VendoLocation
  destination?: VendoLocation
  plannedDeparture?: string
  departure?: string
  plannedArrival?: string
  arrival?: string
  departureDelay?: number
  plannedDeparturePlatform?: string
  departurePlatform?: string
  tripId?: string
  stopovers?: VendoStopoverRecord[]
}

interface VendoJourneyRecord {
  legs?: VendoJourneyLegRecord[]
}

interface VendoClient {
  locations: (query: string, options: Record<string, unknown>) => Promise<unknown>
  departures: (ibnr: string, options: Record<string, unknown>) => Promise<{ departures?: VendoDepartureRecord[] }>
  trip: (tripId: string, options: Record<string, unknown>) => Promise<{ trip?: VendoTripRecord | null }>
  journeys: (
    fromIbnr: string,
    toIbnr: string,
    options: Record<string, unknown>
  ) => Promise<{ journeys?: VendoJourneyRecord[] }>
}

function hasTripId(record: VendoDepartureRecord): record is VendoDepartureRecord & { tripId: string } {
  return typeof record.tripId === 'string' && record.tripId.length > 0
}

function toCoordinates(
  feature: { geometry?: { type?: string; coordinates?: [number, number] } }
): [number, number] | null {
  if (feature.geometry?.type !== 'Point' || !feature.geometry.coordinates) return null
  return feature.geometry.coordinates
}

// ─── Client singletons ────────────────────────────────────────────────────────
// db-vendo-client is ESM-only — must be loaded via dynamic import so Next.js
// doesn't try to bundle it through webpack (configured in serverExternalPackages).

let _client: VendoClient | null = null
let _scanClient: VendoClient | null = null

// Main client with withRetrying — used for all single-call operations.
async function getClient(): Promise<VendoClient> {
  if (!_client) {
    const { createClient } = await import('db-vendo-client')
    const { withRetrying } = await import('db-vendo-client/retry.js')
    const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js')
    _client = createClient(withRetrying(dbnavProfile), 'railtrax/1.0 (contact@railtrax.eu)') as VendoClient
  }
  return _client
}

// Scan client without retrying — used for hub-scanning in getJourneyByTrainNumber.
// The retry wrapper stalls 5 s on every error; for board scans we prefer fast fail.
async function getScanClient(): Promise<VendoClient> {
  if (!_scanClient) {
    const { createClient } = await import('db-vendo-client')
    const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js')
    _scanClient = createClient(dbnavProfile, 'railtrax/1.0 (contact@railtrax.eu)') as VendoClient
  }
  return _scanClient
}

// ─── Product filters ──────────────────────────────────────────────────────────

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

// ─── a. searchStations ────────────────────────────────────────────────────────

/**
 * Search for stations by name.
 * Cached 24 h — station names/IDs rarely change.
 */
export async function searchStations(query: string): Promise<Station[]> {
  const key = `stations:${query.toLowerCase().trim()}`
  return cached(key, 86400, async () => {
    const client = await getClient()
    const locations = await client.locations(query, {
      results: 8,
      stops: true,
      addresses: false,
      poi: false,
    })
    return (locations as VendoLocation[])
      .filter((l) => l.type === 'stop' || l.type === 'station')
      .map((l): Station => ({
        id: l.id ?? '',
        name: l.name ?? '',
        lat: l.location?.latitude ?? null,
        lon: l.location?.longitude ?? null,
      }))
  })
}

// ─── b. getDepartures ─────────────────────────────────────────────────────────

/**
 * Get departures from a station.
 * Cached 2 min — keyed on 2-minute bucket so live delay updates are visible
 * within two minutes, without hammering the API on every keystroke.
 */
export async function getDepartures(
  ibnr: string,
  when: Date,
  duration = 90,
): Promise<Departure[]> {
  const bucket = Math.floor(when.getTime() / 120_000)
  const key = `dep:${ibnr}:${bucket}`
  return cached(key, 120, async () => {
    const client = await getClient()
    const { departures } = await client.departures(ibnr, {
      when,
      duration,
      results: 50,
      products: TRAIN_PRODUCTS,
    })
    return (departures ?? [])
      .filter(hasTripId)
      .map((d): Departure => ({
        tripId: d.tripId,
        trainNumber: d.line?.name ?? '',
        lineName: d.line?.name ?? '',
        direction: d.direction ?? '',
        plannedWhen: d.plannedWhen ?? d.when ?? '',
        actualWhen: d.when ?? null,
        delayMinutes: Math.round((d.delay ?? 0) / 60),
        plannedPlatform: d.plannedPlatform ?? null,
        actualPlatform: d.platform ?? null,
        cancelled: d.cancelled ?? false,
      }))
  })
}

/**
 * Get departures WITHOUT caching — used for train number search.
 * Always fetches fresh data from the API.
 */
export async function getDeparturesFresh(
  ibnr: string,
  when: Date,
  duration = 180,
): Promise<Departure[]> {
  const client = await getClient()
  const { departures } = await client.departures(ibnr, {
    when,
    duration,
    results: 60,
    products: TRAIN_PRODUCTS,
  })
  return (departures ?? [])
    .filter(hasTripId)
    .map((d): Departure => ({
      tripId: d.tripId,
      trainNumber: d.line?.name ?? '',
      lineName: d.line?.name ?? '',
      direction: d.direction ?? '',
      plannedWhen: d.plannedWhen ?? d.when ?? '',
      actualWhen: d.when ?? null,
      delayMinutes: Math.round((d.delay ?? 0) / 60),
      plannedPlatform: d.plannedPlatform ?? null,
      actualPlatform: d.platform ?? null,
      cancelled: d.cancelled ?? false,
    }))
}

// ─── c. getTripById ───────────────────────────────────────────────────────────

/**
 * Fetch a full trip (stopovers + polyline) by tripId.
 * Cached 5 min — real-time delays update at most every few minutes.
 */
export async function getTripById(tripId: string): Promise<VendoTrip | null> {
  const key = `trip:${tripId}`
  return cached(key, 300, async () => {
    const client = await getClient()
    const { trip } = await client.trip(tripId, { stopovers: true, polyline: true })
    if (!trip) return null

    const stops: VendoStop[] = (trip.stopovers ?? []).map((s): VendoStop => ({
      name: s.stop?.name ?? '',
      ibnr: s.stop?.id ?? '',
      plannedArr: s.plannedArrival ?? null,
      actualArr: s.arrival ?? null,
      plannedDep: s.plannedDeparture ?? null,
      actualDep: s.departure ?? null,
      delayMinutes: Math.round(((s.departureDelay ?? s.arrivalDelay ?? 0)) / 60),
      platform: s.platform ?? s.plannedPlatform ?? null,
    }))

    const features = trip?.polyline?.features ?? []
    let polyline: VendoTrip['polyline'] = null
    if (features.length) {
      const coords: [number, number][] = features
        .map(toCoordinates)
        .filter((coords): coords is [number, number] => coords !== null)
      if (coords.length >= 2) polyline = { type: 'LineString', coordinates: coords }
    }

    return {
      tripId: trip.id ?? tripId,
      lineName: trip.line?.name ?? '',
      operator: trip.line?.operator?.name ?? deriveOperatorFromIbnr(trip.origin?.id ?? null),
      stops,
      polyline,
    }
  })
}

export interface JourneySearchOptions {
  viaIbnr?: string
  bike?: boolean
  maxTransfers?: number
  onlyLongDistance?: boolean
}

// ─── d. searchJourneys ────────────────────────────────────────────────────────

/**
 * Search connections between two stations.
 * Cached 5 min — keyed on 5-minute bucket so repeated searches are instant
 * while timetable results stay reasonably fresh.
 */
export async function searchJourneys(
  fromIbnr: string,
  toIbnr: string,
  datetime: Date,
  travelClass: 1 | 2,
  options?: JourneySearchOptions,
): Promise<Journey[]> {
  const { viaIbnr, bike, maxTransfers, onlyLongDistance } = options ?? {}
  const bucket = Math.floor(datetime.getTime() / 300_000)
  const key = `journeys:${fromIbnr}:${toIbnr}:${viaIbnr ?? 'none'}:${bucket}:${travelClass}:${bike ? 'bike' : 'nobike'}:${maxTransfers ?? 'any'}:${onlyLongDistance ? 'ld' : 'all'}`
  return cached(key, 300, async () => {
    const client = await getClient()
    const result = await client.journeys(fromIbnr, toIbnr, {
      departure: datetime,
      results: 6,
      tickets: false,
      firstClass: travelClass === 1,
      products: LONG_DISTANCE_PRODUCTS,
      stopovers: true,
      ...(viaIbnr && { via: viaIbnr }),
      ...(bike && { bike: true }),
      ...(maxTransfers !== undefined && { transfers: maxTransfers }),
    })

    let journeys = (result.journeys ?? [])
      .filter((j) => !j.legs?.every((l) => l.walking))
      .map((j): Journey => ({
        legs: (j.legs ?? [])
          .filter((l) => l.line) // skip walking legs
          .map((l): JourneyLeg => {
            const originId = l.origin?.id
            const destId = l.destination?.id
            const midStops: Stop[] = (l.stopovers ?? [])
              .filter((s) => s.stop?.id !== originId && s.stop?.id !== destId)
              .map((s): Stop => ({
                name: s.stop?.name ?? '',
                ibnr: s.stop?.id ?? '',
                plannedArrival: s.plannedArrival ?? null,
                actualArrival: s.actualArrival ?? null,
                plannedDeparture: s.plannedDeparture ?? null,
                actualDeparture: s.actualDeparture ?? null,
                platform: s.platform ?? null,
                cancelled: s.cancelled ?? false,
              }))
            return {
              origin: l.origin?.name ?? '',
              originIbnr: l.origin?.id ?? null,
              originLat: l.origin?.location?.latitude ?? null,
              originLon: l.origin?.location?.longitude ?? null,
              destination: l.destination?.name ?? '',
              destinationIbnr: l.destination?.id ?? null,
              destinationLat: l.destination?.location?.latitude ?? null,
              destinationLon: l.destination?.location?.longitude ?? null,
              departure: l.plannedDeparture ?? l.departure ?? '',
              arrival: l.plannedArrival ?? l.arrival ?? '',
              operator: l.line?.operator?.name ?? deriveOperatorFromIbnr(l.origin?.id ?? null),
              trainNumber: l.line?.name ?? '',
              tripId: l.tripId ?? null,
              delayMinutes: Math.round(((l.departureDelay ?? 0)) / 60),
              platform: l.plannedDeparturePlatform ?? l.departurePlatform ?? null,
              stopovers: midStops,
            }
          }),
      }))
      .filter((j: Journey) => j.legs.length > 0)

    if (onlyLongDistance) {
      const longDistancePattern = /^(ICE|IC|EC|RJ|NJ|TGV|OUIGO|FR)/i
      journeys = journeys.filter((j: Journey) =>
        j.legs.some(l => longDistancePattern.test(l.trainNumber ?? ''))
      )
    }

    return journeys
  })
}

// ─── Polyline helper (used by /api/trips/[id]/polylines) ─────────────────────

/**
 * Fetch a polyline for a stored leg by matching it in the departure board.
 * Returns null on any failure — straight-line fallback is used on the client.
 * Not Redis-cached since it's a one-shot write path.
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
    const match = (departures ?? []).find((dep) => {
      if (!dep.tripId || dep.cancelled) return false
      const lineName = (dep.line?.name ?? '').replace(/\s+/g, '').toLowerCase()
      const fahrtNr = (dep.line?.fahrtNr ?? '').replace(/\s+/g, '').toLowerCase()
      return lineName === normalised || fahrtNr === normalised
    })
    if (!match?.tripId) return null

    const trip = await getTripById(match.tripId)
    return trip?.polyline?.coordinates ?? null
  } catch {
    return null
  }
}

// ─── Train-number hub scan (used by /api/trains) ──────────────────────────────

const SCAN_HUBS = [
  '8000105', // Frankfurt Hbf
  '8011160', // Berlin Hbf
]
const SCAN_HOURS = [9, 12, 15, 6, 18, 21, 3, 0]

/**
 * Find a journey by train number by scanning major hub station boards.
 * The dbnav board returns ~30 results per ~1-hour window and the server
 * serialises concurrent requests, so we scan sequentially with early exit.
 * Frankfurt → Berlin; daytime hours first. Most trains found in 1–3 calls.
 */
export async function getJourneyByTrainNumber(
  trainNumber: string,
  date: Date,
): Promise<VendoTrip | null> {
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
        const match = (departures ?? []).find((dep) => {
          if (!dep.tripId || dep.cancelled) return false
          return (dep.line?.name ?? '').replace(/\s+/g, '').toLowerCase() === normalised
        })
        if (match?.tripId) return getTripById(match.tripId)
      } catch {
        // slot failed — continue to next
      }
    }
  }
  return null
}
