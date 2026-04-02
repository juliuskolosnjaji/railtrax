import type { Leg } from '@prisma/client'

interface TraewellingIdentifier {
  type?: string
  identifier?: string
}

interface TraewellingStation {
  id?: number | string
  name?: string
  ibnr?: string
  identifiers?: TraewellingIdentifier[]
}

interface TraewellingLine {
  name?: string
  fahrtNr?: string
}

interface TraewellingDeparture {
  tripId?: string
  line?: TraewellingLine
}

interface TraewellingStopover {
  id?: number | string
  name?: string
  departurePlanned?: string
  departure?: string
  arrivalPlanned?: string
  arrival?: string
}

interface TraewellingTripDetail {
  stopovers?: TraewellingStopover[]
  stops?: TraewellingStopover[]
}

interface TraewellingCheckinSuccessData {
  id?: string | number
  status?: {
    id?: string | number
  }
}

interface TraewellingCheckinResponse {
  data?: {
    id?: string | number
    status?: {
      id?: string | number
    }
  } | TraewellingTripDetail[] | TraewellingStation[] | TraewellingDeparture[] | TraewellingStation | TraewellingTripDetail | TraewellingCheckinSuccessData
  id?: string | number
  message?: string
  error?: string
  errors?: unknown
}

function toPositiveInteger(value: number | string | undefined): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

function asDataArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && 'data' in value) {
    const data = (value as { data?: unknown }).data
    if (Array.isArray(data)) return data as T[]
  }
  return []
}

export class TraewellingError extends Error {
  constructor(
    public code: 'train_not_found' | 'already_checked_in' | 'auth_failed' | 'api_error',
    message: string
  ) {
    super(message)
    this.name = 'TraewellingError'
  }
}

export async function checkin(token: string, leg: Leg): Promise<{ statusId: string }> {
  console.log('=== TRÄWELLING CHECKIN START ===')
  console.log('Origin:', leg.originName, 'IBNR:', leg.originIbnr)
  console.log('Dest:', leg.destName, 'IBNR:', leg.destIbnr)
  console.log('Train:', leg.trainNumber, 'Line:', leg.lineName)
  console.log('Departure:', leg.plannedDeparture)

  // ── STEP 1: Find station using IBNR via direct endpoint ──────

  let stationId: number | null = null
  let stationName: string = leg.originName

  if (leg.originIbnr) {
    // Try multiple Träwelling IBNR endpoint formats
    const ibnrEndpoints = [
      `https://traewelling.de/api/v1/station/${leg.originIbnr}`,
      `https://traewelling.de/api/v1/stations/${leg.originIbnr}`,
    ]
    for (const url of ibnrEndpoints) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      console.log(`${url} → ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        const station = data.data ?? data
        if (station?.id) {
          stationId = station.id
          stationName = station.name
          console.log('IBNR endpoint success:', station.name, station.id)
          break
        }
      }
    }

    if (!stationId) {
      console.log('Direct IBNR lookup failed, trying autocomplete...')
      const autoRes = await fetch(
        `https://traewelling.de/api/v1/stations/autocomplete/${leg.originIbnr}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
      if (autoRes.ok) {
        const autoData: unknown = await autoRes.json()
        const stations = asDataArray<TraewellingStation>(autoData)
        console.log('Autocomplete results:',
          stations.map((s) => `${s.name} (${s.id})`))
        const match = stations.find((s) =>
          s.identifiers?.some((id) =>
            id.type === 'de_db_ibnr' && id.identifier === leg.originIbnr
          )
        )
        if (match) {
          stationId = toPositiveInteger(match.id)
          stationName = match.name ?? stationName
          console.log('Autocomplete IBNR match:', match.name, match.id)
        } else if (stations.length > 0) {
          stationId = toPositiveInteger(stations[0].id)
          stationName = stations[0].name ?? stationName
          console.log('Autocomplete first result:', stations[0].name)
        }
      }
    }
  }

  // Final fallback: name-based search
  if (!stationId) {
    console.log('Falling back to name search for:', leg.originName)
    const nameRes = await fetch(
      `https://traewelling.de/api/v1/stations?query=${encodeURIComponent(leg.originName)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (!nameRes.ok) {
      const txt = await nameRes.text()
      console.error('Station search failed:', nameRes.status, txt)
      throw new TraewellingError('api_error', `Bahnhofssuche fehlgeschlagen: ${nameRes.status}`)
    }
    const nameData: unknown = await nameRes.json()
    const stations = asDataArray<TraewellingStation>(nameData)
    console.log('Name search results:',
      stations.map((s) => `${s.name} (id:${s.id} ibnr:${s.ibnr})`).slice(0, 5))
    if (stations.length === 0) {
      throw new TraewellingError(
        'train_not_found',
        `Bahnhof "${leg.originName}" nicht in Träwelling gefunden.`
      )
    }
    const exact = stations.find((s) =>
      s.name?.toLowerCase() === leg.originName.toLowerCase()
    )
    const station = exact ?? stations[0]
    stationId = toPositiveInteger(station.id)
    stationName = station.name ?? stationName
    console.log('Using station from name search:', stationName, stationId)
  }

  // ── STEP 2: Fetch departures ─────────────────────────────────

  const depTime = new Date(leg.plannedDeparture)
  const whenParam = new Date(depTime.getTime() - 5 * 60000).toISOString()
  const depUrl = `https://traewelling.de/api/v1/station/${stationId}/departures?when=${encodeURIComponent(whenParam)}`
  console.log('Fetching departures:', depUrl)

  const depRes = await fetch(depUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  if (!depRes.ok) {
    const txt = await depRes.text()
    console.error('Departures failed:', depRes.status, txt)
    if (depRes.status === 400) {
      let msg = 'Ungültige Stations-ID.'
      try { msg = JSON.parse(txt)?.message ?? msg } catch {}
      throw new TraewellingError('api_error', msg)
    }
    if (depRes.status === 401 || depRes.status === 403) {
      throw new TraewellingError(
        'auth_failed',
        'Träwelling-Authentifizierung fehlgeschlagen. Bitte neu verbinden.'
      )
    }
    throw new TraewellingError(
      'api_error',
      `Abfahrten konnten nicht geladen werden: ${depRes.status}`
    )
  }

  const depData: unknown = await depRes.json()
  const departures = asDataArray<TraewellingDeparture>(depData)
  console.log('Got', departures.length, 'departures')
  console.log('Departure trains:',
    departures.map((d) =>
      `${d.line?.name} fahrtNr:${d.line?.fahrtNr} tripId:${d.tripId}`
    ).slice(0, 10)
  )

  // ── STEP 3: Find matching train ───────────────────────────────

  const normalize = (s: string | null | undefined) =>
    (s ?? '').toLowerCase().replace(/\s+/g, '').replace(/^0+/, '')

  console.log('Looking for train:', { trainNumber: leg.trainNumber, lineName: leg.lineName })

  const matchingDep = departures.find((dep) => {
    const depName    = (dep.line?.name ?? '').trim()
    const depFahrtNr = (dep.line?.fahrtNr ?? '').trim()
    const depNorm    = normalize(depName)
    const depFNorm   = normalize(depFahrtNr)

    const legTrain   = (leg.trainNumber ?? '').trim()
    const legLine    = (leg.lineName ?? '').trim()
    const legNorm    = normalize(legTrain || legLine)

    // Numeric only: "RE12" → "12", "ICE521" → "521"
    const legNum  = legNorm.replace(/[^0-9]/g, '')
    const depFNum = depFNorm.replace(/[^0-9]/g, '')

    // Alphabetic prefix: "RE12" → "RE"
    const legPrefix = legNorm.replace(/[0-9]/g, '').toUpperCase()

    // s1: exact full match "re12" === "re12"
    const s1 = !!(legNorm && depNorm === legNorm)

    // s2: Träwelling strips prefix → dep="12", leg="re12" → legNum="12"
    const hasPrefix = legPrefix.length > 0 &&
      ['RE','RB','IC','ICE','EC','IR','S','U','TGV','RJ','RJX',
       'NJ','EN','FR','FA','FB','EST'].includes(legPrefix)
    const s2 = !!(hasPrefix && legNum && depNorm === legNum)

    // s3: fahrtNr numeric match
    const s3 = !!(legNum && depFNum && depFNum === legNum)

    // s4: dep name contains our full identifier
    const s4 = !!(legNorm && depNorm.includes(legNorm))

    // s5: our identifier contains dep name (short dep like "re")
    const s5 = !!(depNorm.length > 1 && legNorm.includes(depNorm) &&
      depNorm.length >= legNorm.length - 3)

    const matched = s1 || s2 || s3 || s4 || s5
    if (matched) {
      console.log('Matched:', depName, 'fahrtNr:', depFahrtNr,
        'strategies:', { s1, s2, s3, s4, s5 })
    }
    return matched
  })

  if (!matchingDep) {
    console.error('No matching train found. Available:',
      departures.map((d) => `${d.line?.name} (${d.line?.fahrtNr})`).slice(0, 15)
    )
    throw new TraewellingError(
      'train_not_found',
      `Zug "${leg.trainNumber ?? leg.lineName}" nicht im Träwelling-Abfahrtsboard gefunden. ` +
      `Verfügbare Züge: ${departures.slice(0, 5).map((d) => d.line?.name).join(', ')}`
    )
  }

  const tripIdForCheckin = matchingDep.tripId
  const matchingLineName = matchingDep.line?.name ?? leg.lineName ?? leg.trainNumber ?? ''
  if (!tripIdForCheckin || !matchingLineName) {
    throw new TraewellingError(
      'train_not_found',
      'Zugdaten unvollständig. Träwelling-Check-in konnte nicht vorbereitet werden.'
    )
  }

  // ── STEP 4 + 5: Fetch trip stopovers to get correct station IDs ─

  let correctStartId: number = stationId ?? 0
  let correctDestId: number | null = null

  try {
      const tripDetailRes = await fetch(
      `https://traewelling.de/api/v1/trains/trip?` +
      `hafasTripId=${encodeURIComponent(tripIdForCheckin)}` +
      `&lineName=${encodeURIComponent(matchingLineName)}` +
      `&start=${stationId}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )

    if (tripDetailRes.ok) {
      const tripDetail: TraewellingCheckinResponse = await tripDetailRes.json()
      const tripData = tripDetail.data
      const trip = Array.isArray(tripData) ? tripData[0] : tripData

      console.log('Full trip response keys:', Object.keys(tripDetail?.data ?? tripDetail ?? {}))
      // tripIdForCheckin stays as matchingDep.tripId (HAFAS trip ID or MOTIS UUID) —
      // trip.dataSource is the MotisSourceLicense attribution, not the trip identifier.
      console.log('Using tripId from departures board:', tripIdForCheckin)

      const stopovers = (trip as TraewellingTripDetail | undefined)?.stopovers
        ?? (trip as TraewellingTripDetail | undefined)?.stops
        ?? []
      console.log('Trip stopovers count:', stopovers.length)
      console.log('Stopovers:', stopovers.map((s) =>
        `${s.name} (id:${s.id}) dep:${s.departurePlanned}`
      ).slice(0, 15))

      if (stopovers.length > 0) {
        const legDepTime = new Date(leg.plannedDeparture).getTime()
        const legArrTime = new Date(leg.plannedArrival).getTime()

        // Find start stopover by departure time (within 5 min)
        const startStopover = stopovers.find((s) => {
          const dep = s.departurePlanned ?? s.departure
          if (!dep) return false
          return Math.abs(new Date(dep).getTime() - legDepTime) < 5 * 60 * 1000
        })
        const parsedStartId = toPositiveInteger(startStopover?.id)
        if (parsedStartId) {
          correctStartId = parsedStartId
          console.log('Start from stopovers:', startStopover?.name, correctStartId)
        }

        // Find destination stopover by arrival time (within 5 min)
        const destStopover = stopovers.find((s) => {
          const arr = s.arrivalPlanned ?? s.arrival
          if (!arr) return false
          return Math.abs(new Date(arr).getTime() - legArrTime) < 5 * 60 * 1000
        })
        const parsedDestStopId = toPositiveInteger(destStopover?.id)
        if (parsedDestStopId) {
          correctDestId = parsedDestStopId
          console.log('Dest from stopovers:', destStopover?.name, correctDestId)
        }

        // Fallback: match destination by name
        if (!correctDestId) {
          const destByName = stopovers.find((s) =>
            (s.name ?? '').toLowerCase().includes(
              leg.destName.toLowerCase().slice(0, 5)
            )
          )
          const parsedDestNameId = toPositiveInteger(destByName?.id)
          if (parsedDestNameId) {
            correctDestId = parsedDestNameId
            console.log('Dest by name fallback:', destByName?.name, correctDestId)
          }
        }

        // Hard fallback: use last stopover
        if (correctDestId === null) {
          const last = stopovers[stopovers.length - 1]
          const parsedLastId = toPositiveInteger(last?.id)
          if (parsedLastId) {
            correctDestId = parsedLastId
            console.log('Dest fallback to last stopover:', last.name, correctDestId)
          }
        }
      } else {
        console.log('No stopovers in trip response, using fallback station IDs')
      }
    } else {
      console.log('Trip detail fetch failed:', tripDetailRes.status, '— using stationId fallback')
    }
  } catch (e) {
    console.log('Trip detail fetch error (non-fatal):', e)
  }

  // ── STEP 6: Validate IDs ──────────────────────────────────────
  // Station IDs must be positive integers for Träwelling

  if (!Number.isInteger(correctStartId) || correctStartId <= 0) {
    throw new TraewellingError(
      'api_error',
      `Ungültige Start-Station-ID: ${correctStartId}. Station nicht in Träwelling gefunden.`
    )
  }

  if (correctDestId === null || !Number.isInteger(correctDestId) || correctDestId <= 0) {
    throw new TraewellingError(
      'train_not_found',
      `Zielbahnhof "${leg.destName}" nicht im Zugfahrplan gefunden.`
    )
  }

  const payload: Record<string, unknown> = {
    tripId:      String(tripIdForCheckin),
    lineName:    matchingLineName,
    start:       correctStartId,
    destination: correctDestId,
    departure:   new Date(leg.plannedDeparture).toISOString(),
    arrival:     new Date(leg.plannedArrival).toISOString(),
    ibnr:        false,
  }

  console.log('Final checkin payload:', JSON.stringify(payload))

  // ── STEP 7: POST checkin ──────────────────────────────────────

  const checkinRes = await fetch('https://traewelling.de/api/v1/trains/checkin', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const rawText = await checkinRes.text()
  console.log(`Träwelling checkin response (${checkinRes.status}):`, rawText)

  let checkinData: TraewellingCheckinResponse
  try {
    checkinData = JSON.parse(rawText) as TraewellingCheckinResponse
  } catch {
    throw new TraewellingError(
      'api_error',
      `Ungültige Antwort von Träwelling: ${rawText.slice(0, 200)}`
    )
  }

  if (checkinRes.status === 401 || checkinRes.status === 403) {
    throw new TraewellingError(
      'auth_failed',
      'Träwelling-Authentifizierung fehlgeschlagen. Bitte neu verbinden.'
    )
  }

  if (checkinRes.status === 409) {
    throw new TraewellingError(
      'already_checked_in',
      'Du bist bereits in einen Zug für diesen Zeitraum eingecheckt.'
    )
  }

  if (checkinRes.status === 422) {
    const errors = checkinData?.errors
      ? JSON.stringify(checkinData.errors)
      : checkinData?.message ?? rawText
    console.error('Validation error:', errors)
    throw new TraewellingError('api_error', `Träwelling Validierungsfehler: ${errors}`)
  }

  if (checkinRes.status === 500) {
    const msg = checkinData?.message ?? 'Träwelling Serverfehler'
    console.error('Träwelling 500:', msg, 'payload was:', JSON.stringify(payload))

    const minutesAgo = Math.round(
      (Date.now() - new Date(leg.plannedDeparture).getTime()) / 60000
    )
    if (minutesAgo > 30) {
      throw new TraewellingError(
        'api_error',
        `Check-in nicht möglich: Der Zug ist bereits vor ${minutesAgo} Minuten abgefahren. ` +
        `Check-in ist nur für aktuelle oder zukünftige Fahrten möglich.`
      )
    }

    throw new TraewellingError('api_error', `Träwelling Serverfehler. Bitte erneut versuchen. (${msg})`)
  }

  if (!checkinRes.ok) {
    const msg = checkinData?.message ?? checkinData?.error ?? rawText.slice(0, 200)
    throw new TraewellingError('api_error', `Träwelling Fehler: ${msg}`)
  }

  const statusId =
    (!Array.isArray(checkinData.data) && typeof checkinData.data === 'object' ? (checkinData.data as TraewellingCheckinSuccessData).status?.id : undefined) ??
    (!Array.isArray(checkinData.data) && typeof checkinData.data === 'object' ? (checkinData.data as TraewellingCheckinSuccessData).id : undefined) ??
    checkinData?.id
  if (!statusId) {
    console.error('No statusId in response:', checkinData)
    throw new TraewellingError(
      'api_error',
      'Check-in erfolgreich aber keine Status-ID erhalten.'
    )
  }

  console.log('=== TRÄWELLING CHECKIN SUCCESS === statusId:', statusId)
  return { statusId: String(statusId) }
}
