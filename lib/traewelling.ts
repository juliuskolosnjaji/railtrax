import type { Leg } from '@prisma/client'

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
        const autoData = await autoRes.json()
        const stations: any[] = autoData.data ?? autoData ?? []
        console.log('Autocomplete results:',
          stations.map((s: any) => `${s.name} (${s.id})`))
        const match = stations.find((s: any) =>
          s.identifiers?.some((id: any) =>
            id.type === 'de_db_ibnr' && id.identifier === leg.originIbnr
          )
        )
        if (match) {
          stationId = match.id
          stationName = match.name
          console.log('Autocomplete IBNR match:', match.name, match.id)
        } else if (stations.length > 0) {
          stationId = stations[0].id
          stationName = stations[0].name
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
    const nameData = await nameRes.json()
    const stations: any[] = nameData.data ?? []
    console.log('Name search results:',
      stations.map((s: any) => `${s.name} (id:${s.id} ibnr:${s.ibnr})`).slice(0, 5))
    if (stations.length === 0) {
      throw new TraewellingError(
        'train_not_found',
        `Bahnhof "${leg.originName}" nicht in Träwelling gefunden.`
      )
    }
    const exact = stations.find((s: any) =>
      s.name.toLowerCase() === leg.originName.toLowerCase()
    )
    const station = exact ?? stations[0]
    stationId = station.id
    stationName = station.name
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

  const depData = await depRes.json()
  const departures: any[] = depData.data ?? []
  console.log('Got', departures.length, 'departures')
  console.log('Departure trains:',
    departures.map((d: any) =>
      `${d.line?.name} fahrtNr:${d.line?.fahrtNr} tripId:${d.tripId}`
    ).slice(0, 10)
  )

  // ── STEP 3: Find matching train ───────────────────────────────

  const normalize = (s: string | null | undefined) =>
    (s ?? '').toLowerCase().replace(/\s+/g, '').replace(/^0+/, '')

  console.log('Looking for train:', { trainNumber: leg.trainNumber, lineName: leg.lineName })

  const matchingDep = departures.find((dep: any) => {
    const depName    = (dep.line?.name ?? '').trim()
    const depFahrtNr = (dep.line?.fahrtNr ?? '').trim()
    const depNorm    = normalize(depName)
    const depFNorm   = normalize(depFahrtNr)

    const legTrain   = (leg.trainNumber ?? '').trim()
    const legLine    = (leg.lineName ?? '').trim()
    const legNorm    = normalize(legTrain || legLine)

    // Numeric only: "RE12" → "12", "ICE521" → "521"
    const legNum  = legNorm.replace(/[^0-9]/g, '')
    const depNum  = depNorm.replace(/[^0-9]/g, '')
    const depFNum = depFNorm.replace(/[^0-9]/g, '')

    // Alphabetic prefix: "RE12" → "RE"
    const legPrefix = legNorm.replace(/[0-9]/g, '').toUpperCase()
    const depPrefix = depNorm.replace(/[0-9]/g, '').toUpperCase()

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
      departures.map((d: any) => `${d.line?.name} (${d.line?.fahrtNr})`).slice(0, 15)
    )
    throw new TraewellingError(
      'train_not_found',
      `Zug "${leg.trainNumber ?? leg.lineName}" nicht im Träwelling-Abfahrtsboard gefunden. ` +
      `Verfügbare Züge: ${departures.slice(0, 5).map((d: any) => d.line?.name).join(', ')}`
    )
  }

  // ── STEP 4 + 5: Fetch trip stopovers to get correct station IDs ─

  let tripIdForCheckin: string = matchingDep.tripId
  let correctStartId: number = stationId ?? 0
  let correctDestId: number | null = null

  try {
    const tripDetailRes = await fetch(
      `https://traewelling.de/api/v1/trains/trip?` +
      `hafasTripId=${encodeURIComponent(matchingDep.tripId)}` +
      `&lineName=${encodeURIComponent(matchingDep.line.name)}` +
      `&start=${stationId}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )

    if (tripDetailRes.ok) {
      const tripDetail = await tripDetailRes.json()
      const trip = Array.isArray(tripDetail.data) ? tripDetail.data[0] : tripDetail.data

      console.log('Full trip response keys:', Object.keys(tripDetail?.data ?? tripDetail ?? {}))

      // Get dataSource UUID
      if (trip?.dataSource?.id) {
        tripIdForCheckin = trip.dataSource.id
        console.log('Using dataSource UUID:', tripIdForCheckin)
      } else {
        console.log('No dataSource UUID, using hafasTripId:', tripIdForCheckin)
      }

      const stopovers: any[] = trip?.stopovers ?? trip?.stops ?? []
      console.log('Trip stopovers count:', stopovers.length)
      console.log('Stopovers:', stopovers.map((s: any) =>
        `${s.name} (id:${s.id}) dep:${s.departurePlanned}`
      ).slice(0, 15))

      if (stopovers.length > 0) {
        const legDepTime = new Date(leg.plannedDeparture).getTime()
        const legArrTime = new Date(leg.plannedArrival).getTime()

        // Find start stopover by departure time (within 5 min)
        const startStopover = stopovers.find((s: any) => {
          const dep = s.departurePlanned ?? s.departure
          if (!dep) return false
          return Math.abs(new Date(dep).getTime() - legDepTime) < 5 * 60 * 1000
        })
        if (startStopover?.id) {
          correctStartId = typeof startStopover.id === 'string'
            ? parseInt(startStopover.id) : startStopover.id
          console.log('Start from stopovers:', startStopover.name, correctStartId)
        }

        // Find destination stopover by arrival time (within 5 min)
        const destStopover = stopovers.find((s: any) => {
          const arr = s.arrivalPlanned ?? s.arrival
          if (!arr) return false
          return Math.abs(new Date(arr).getTime() - legArrTime) < 5 * 60 * 1000
        })
        if (destStopover?.id) {
          correctDestId = typeof destStopover.id === 'string'
            ? parseInt(destStopover.id) : destStopover.id
          console.log('Dest from stopovers:', destStopover.name, correctDestId)
        }

        // Fallback: match destination by name
        if (!correctDestId) {
          const destByName = stopovers.find((s: any) =>
            (s.name ?? '').toLowerCase().includes(
              leg.destName.toLowerCase().slice(0, 5)
            )
          )
          if (destByName?.id) {
            correctDestId = typeof destByName.id === 'string'
              ? parseInt(destByName.id) : destByName.id
            console.log('Dest by name fallback:', destByName.name, correctDestId)
          }
        }

        // Hard fallback: use last stopover
        if (correctDestId === null) {
          const last = stopovers[stopovers.length - 1]
          if (last?.id) {
            correctDestId = typeof last.id === 'string'
              ? parseInt(last.id) : last.id
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

  // ── STEP 6: Build payload with correct IDs ────────────────────
  // Always ibnr: false — use Träwelling internal IDs from stopovers.

  if (correctDestId === null) {
    throw new TraewellingError(
      'train_not_found',
      `Zielbahnhof "${leg.destName}" nicht im Zugfahrplan gefunden.`
    )
  }

  const payload: Record<string, unknown> = {
    tripId:      String(tripIdForCheckin),
    lineName:    matchingDep.line.name,
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

  let checkinData: any
  try {
    checkinData = JSON.parse(rawText)
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

  const statusId = checkinData?.data?.id ?? checkinData?.id
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
