import type { Leg } from '@prisma/client'

export class TraewellingError extends Error {
  constructor(public code: 'train_not_found' | 'already_checked_in' | 'auth_failed' | 'api_error', message: string) {
    super(message)
    this.name = 'TraewellingError'
  }
}

async function getStationIdByName(token: string, stationName: string): Promise<{ trwlId: number; useIbnr: boolean; ibnr: number | null } | null> {
  // Use /stations endpoint with query parameter
  const url = `https://traewelling.de/api/v1/stations?query=${encodeURIComponent(stationName)}`
  console.log('Fetching stations from:', url)
  
  const res = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  
  console.log('Stations response status:', res.status)
  
  if (!res.ok) {
    const errorText = await res.text()
    console.error(`Traewelling stations search failed: ${res.status} ${res.statusText}`, errorText)
    return null
  }
  
  const data = await res.json()
  console.log('Traewelling stations response:', JSON.stringify(data, null, 2))
  
  const stations = data.data || []
  
  if (stations.length === 0) {
    console.error('No stations found for:', stationName)
    return null
  }
  
  console.log('Available stations:', stations.map((s: { name: string }) => s.name))
  
  const exact = stations.find((s: { name: string }) => s.name.toLowerCase() === stationName.toLowerCase())
  const station = exact || stations[0]

  // Extract IBNR from identifiers if available
  const ibnrIdentifier = station.identifiers?.find(
    (id: { type: string; identifier: string }) => id.type === 'de_db_ibnr'
  )
  const ibnr = ibnrIdentifier ? parseInt(ibnrIdentifier.identifier, 10) : null

  console.log('Selected station:', station)
  console.log('Extracted IBNR:', ibnr)

  return { 
    trwlId: station.id, 
    useIbnr: ibnr !== null,
    ibnr: ibnr
  }
}

export async function checkin(token: string, leg: Leg): Promise<{ statusId: string }> {
  // 1. Find the correct Träwelling station by IBNR from leg data
  // Use the leg's IBNR to find the exact station (avoiding the "Bonn Hbf" vs "Bonn Hbf (tief)" mismatch)
  let departuresStationId: number | null = null
  
  if (leg.originIbnr) {
    // Search stations by name, then find one with matching IBNR
    const url = `https://traewelling.de/api/v1/stations?query=${encodeURIComponent(leg.originName)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    
    if (res.ok) {
      const data = await res.json()
      const stations = data.data || []
      
      // Find station with matching IBNR from leg
      const matched = stations.find((s: { identifiers?: { type: string; identifier: string }[] }) => 
        s.identifiers?.some((id: { type: string; identifier: string }) => id.type === 'de_db_ibnr' && id.identifier === leg.originIbnr)
      )
      
      if (matched) {
        departuresStationId = matched.id
        console.log('Matched station by IBNR:', matched.name, matched.id, 'IBNR:', leg.originIbnr)
      }
    }
  }
  
  // Fall back to name search if no IBNR match
  if (!departuresStationId) {
    const stationsResult = await getStationIdByName(token, leg.originName)
    if (!stationsResult) {
      throw new TraewellingError('train_not_found', `Could not find station "${leg.originName}" in Träwelling.`)
    }
    departuresStationId = stationsResult.trwlId
    console.log('Using name-based station:', departuresStationId)
  }

  console.log('Fetching departures from station ID:', departuresStationId)

  // 2. Fetch departures for that station
  const when = new Date(leg.plannedDeparture).toISOString()
  
  const departuresRes = await fetch(
    `https://traewelling.de/api/v1/station/${departuresStationId}/departures?when=${when}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  )

  if (departuresRes.status === 401 || departuresRes.status === 403) {
    throw new TraewellingError('auth_failed', 'Träwelling authentication failed. Please reconnect your account.')
  }

  if (!departuresRes.ok) {
    throw new TraewellingError('api_error', 'Failed to fetch departures from Träwelling.')
  }

  const departuresData = await departuresRes.json()
  const departures = departuresData.data || []

  // 3. Find matching departure - match by trainNumber or lineName
  console.log('Leg lineName:', leg.lineName)
  console.log('Leg trainNumber:', leg.trainNumber)
  
  const legTrainNumber = leg.trainNumber?.toLowerCase().replace(/\s+/g, '') || ''
  const legLineName = leg.lineName?.toLowerCase().replace(/\s+/g, '') || ''

  const matchingTrain = departures.find((dep: { line: { name?: string; id?: string; fahrtNr?: string } }) => {
    const depLineName = (dep.line.name || '').toLowerCase().replace(/\s+/g, '')
    const depId = (dep.line.id || '').toLowerCase().replace(/\s+/g, '')
    const depFahrtNr = (dep.line.fahrtNr || '').toLowerCase().replace(/\s+/g, '')
    
    // Match by train number (RE5, RB48, ICE, etc)
    const matchByTrainNumber = legTrainNumber && (
      depLineName === legTrainNumber ||
      depId === legTrainNumber ||
      depFahrtNr.includes(legTrainNumber) ||
      legTrainNumber.includes(depFahrtNr)
    )
    
    // Match by lineName if available
    const matchByLineName = legLineName && (
      depLineName.includes(legLineName) ||
      depId.includes(legLineName)
    )
    
    return matchByTrainNumber || matchByLineName
  })

  if (!matchingTrain) {
    throw new TraewellingError('train_not_found', 'Could not find this train in the Träwelling departure board.')
  }

  // 3. Fetch trip details to try to get a dataSource UUID for checkin.
  //    Per the Träwelling API spec, CheckinRequestBody.tripId is a UUID that
  //    comes from TripResource.dataSource.id. When dataSource is null (common),
  //    the checkin API also accepts the raw HAFAS tripId string from the
  //    departure board. TripResource.id is an internal integer — NOT valid here.
  const tripRes = await fetch(
    `https://traewelling.de/api/v1/trains/trip?hafasTripId=${encodeURIComponent(matchingTrain.tripId)}&lineName=${encodeURIComponent(matchingTrain.line.name)}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    }
  )

  // Try to extract a dataSource UUID; data may be a single object or array
  let tripIdForCheckin: string = matchingTrain.tripId  // HAFAS tripId is the safe default
  if (tripRes.ok) {
    const tripData = await tripRes.json()
    const trip = Array.isArray(tripData.data) ? tripData.data[0] : tripData.data
    const dsId = trip?.dataSource?.id
    if (dsId && typeof dsId === 'string') {
      tripIdForCheckin = dsId
      console.log('Using dataSource UUID as tripId:', tripIdForCheckin)
    } else {
      console.log('No dataSource UUID — using HAFAS tripId:', tripIdForCheckin)
    }
  } else {
    console.log('Trip fetch failed, using HAFAS tripId:', tripIdForCheckin)
  }

  // Use IBNRs for both start and destination (ibnr: true) — consistent and avoids
  // mixing Träwelling internal IDs with IBNRs which causes 500s.
  // Fall back to Träwelling internal ID for start if no IBNR stored on leg.
  const useIbnr = !!(leg.originIbnr && leg.destIbnr)
  const startStation = useIbnr
    ? parseInt(leg.originIbnr!, 10)
    : departuresStationId
  const destStation = leg.destIbnr
    ? parseInt(leg.destIbnr, 10)
    : undefined

  const checkinPayload: Record<string, unknown> = {
    tripId: String(tripIdForCheckin),
    lineName: matchingTrain.line.name,
    start: startStation,
    destination: destStation,
    departure: leg.plannedDeparture.toISOString(),
    arrival: leg.plannedArrival.toISOString(),
    ibnr: useIbnr,
  }

  console.log('Sending Träwelling checkin payload:', checkinPayload)

  const checkinRes = await fetch('https://traewelling.de/api/v1/trains/checkin', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(checkinPayload),
  })

  // Log raw text
  const rawText = await checkinRes.text()
  console.log(`Träwelling checkin response (${checkinRes.status}):`, rawText)

  let checkinData
  try {
    checkinData = JSON.parse(rawText)
  } catch {
    throw new TraewellingError('api_error', 'Invalid response from Träwelling.')
  }

  // Handle server errors
  if (checkinRes.status === 500) {
    const msg = checkinData.message || 'Träwelling server error. Please try again in a few moments.'
    // Check for common error patterns
    if (msg.toLowerCase().includes('already departed') || msg.toLowerCase().includes('past')) {
      throw new TraewellingError('train_not_found', 'This train has already departed. Check-in is only available for upcoming journeys.')
    }
    throw new TraewellingError('api_error', msg)
  }

  if (checkinRes.status === 401 || checkinRes.status === 403) {
    throw new TraewellingError('auth_failed', 'Träwelling authentication failed. Please reconnect your account.')
  }

  if (checkinRes.status === 409 || checkinData.error?.includes('already')) {
     throw new TraewellingError('already_checked_in', 'You are already checked in to a train for this time.')
  }

  if (!checkinRes.ok) {
    // Other errors
    const msg = checkinData.message || checkinData.error || 'Failed to check in to Träwelling.'
    throw new TraewellingError('api_error', `Träwelling API Error: ${msg}`)
  }

  return { statusId: String(checkinData.data.id) }
}
