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

  // ── STEP 1: Find origin station ──────────────────────────────

  let stationId: number | null = null

  if (leg.originIbnr) {
    const ibnrRes = await fetch(
      `https://traewelling.de/api/v1/stations?query=${leg.originIbnr}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (ibnrRes.ok) {
      const ibnrData = await ibnrRes.json()
      const stations: any[] = ibnrData.data ?? []
      const match = stations.find((s: any) =>
        s.ibnr === parseInt(leg.originIbnr!) ||
        s.ibnr === leg.originIbnr ||
        s.identifiers?.some((id: any) =>
          id.type === 'de_db_ibnr' && id.identifier === leg.originIbnr
        )
      )
      if (match) {
        stationId = match.id
        console.log('Found station by IBNR:', match.name, stationId)
      }
    }
  }

  if (!stationId) {
    const nameRes = await fetch(
      `https://traewelling.de/api/v1/stations?query=${encodeURIComponent(leg.originName)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (!nameRes.ok) {
      const txt = await nameRes.text()
      console.error('Station search failed:', nameRes.status, txt)
      throw new TraewellingError('api_error', `Station search failed: ${nameRes.status}`)
    }
    const nameData = await nameRes.json()
    const stations: any[] = nameData.data ?? []
    console.log('Station search results for', leg.originName, ':',
      stations.map((s: any) => `${s.name} (id:${s.id} ibnr:${s.ibnr})`))

    if (stations.length === 0) {
      throw new TraewellingError(
        'train_not_found',
        `Bahnhof "${leg.originName}" nicht in Träwelling gefunden.`
      )
    }
    stationId = stations[0].id
    console.log('Using first station:', stations[0].name, stationId)
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

  const legTrainNorm = normalize(leg.trainNumber)
  const legLineNorm  = normalize(leg.lineName)
  const legNumeric   = (leg.trainNumber ?? leg.lineName ?? '').replace(/[^0-9]/g, '')

  console.log('Looking for train:', { legTrainNorm, legLineNorm, legNumeric })

  const matchingDep = departures.find((dep: any) => {
    const depLineName = normalize(dep.line?.name)
    const depFahrtNr  = normalize(dep.line?.fahrtNr)
    const depId       = normalize(dep.line?.id)
    const depNumeric  = (dep.line?.fahrtNr ?? dep.line?.name ?? '').replace(/[^0-9]/g, '')

    const m1 = !!(legLineNorm  && depLineName === legLineNorm)
    const m2 = !!(legTrainNorm && depLineName === legTrainNorm)
    const m3 = !!(legNumeric   && depFahrtNr  === legNumeric)
    const m4 = !!(legNumeric   && depNumeric  === legNumeric)
    const m5 = !!(legLineNorm  && depId       === legLineNorm)
    const m6 = !!(legTrainNorm && depFahrtNr.includes(legTrainNorm))

    const matched = m1 || m2 || m3 || m4 || m5 || m6
    if (matched) {
      console.log('Matched departure:', dep.line?.name,
        'fahrtNr:', dep.line?.fahrtNr,
        'by strategies:', { m1, m2, m3, m4, m5, m6 })
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

  // ── STEP 4: Get trip details for tripId ──────────────────────

  let tripIdForCheckin: string = matchingDep.tripId

  try {
    const tripRes = await fetch(
      `https://traewelling.de/api/v1/trains/trip?` +
      `hafasTripId=${encodeURIComponent(matchingDep.tripId)}` +
      `&lineName=${encodeURIComponent(matchingDep.line.name)}` +
      `&start=${stationId}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (tripRes.ok) {
      const tripData = await tripRes.json()
      const trip = Array.isArray(tripData.data) ? tripData.data[0] : tripData.data
      if (trip?.dataSource?.id) {
        tripIdForCheckin = trip.dataSource.id
        console.log('Using dataSource UUID:', tripIdForCheckin)
      } else {
        console.log('No dataSource UUID, using hafasTripId:', tripIdForCheckin)
      }
    } else {
      console.log('Trip fetch failed, using hafasTripId:', tripIdForCheckin)
    }
  } catch (e) {
    console.log('Trip fetch error (non-fatal):', e)
  }

  // ── STEP 5: Determine destination station ────────────────────

  let destinationStation: number | undefined

  if (leg.destIbnr) {
    destinationStation = parseInt(leg.destIbnr, 10)
  } else {
    try {
      const destRes = await fetch(
        `https://traewelling.de/api/v1/stations?query=${encodeURIComponent(leg.destName)}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
      if (destRes.ok) {
        const destData = await destRes.json()
        const destStations: any[] = destData.data ?? []
        if (destStations.length > 0) {
          destinationStation = destStations[0].id
          console.log('Destination station:', destStations[0].name, destinationStation)
        }
      }
    } catch (e) {
      console.log('Destination lookup failed (non-fatal):', e)
    }
  }

  // ── STEP 6: Build checkin payload ────────────────────────────

  const useIbnr = !!(
    leg.originIbnr && leg.destIbnr &&
    !isNaN(parseInt(leg.originIbnr)) &&
    !isNaN(parseInt(leg.destIbnr))
  )
  const startStation = useIbnr ? parseInt(leg.originIbnr!, 10) : stationId

  const payload: Record<string, unknown> = {
    tripId:    String(tripIdForCheckin),
    lineName:  matchingDep.line.name,
    start:     startStation,
    departure: new Date(leg.plannedDeparture).toISOString(),
    arrival:   new Date(leg.plannedArrival).toISOString(),
    ibnr:      useIbnr,
  }

  if (destinationStation !== undefined) {
    payload.destination = useIbnr
      ? parseInt(leg.destIbnr!, 10)
      : destinationStation
  }

  console.log('Checkin payload:', JSON.stringify(payload))

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
    console.error('Träwelling 500:', msg)
    throw new TraewellingError('api_error', msg)
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
