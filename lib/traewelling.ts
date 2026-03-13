import type { Leg } from '@prisma/client'

export class TraewellingError extends Error {
  constructor(public code: 'train_not_found' | 'already_checked_in' | 'auth_failed' | 'api_error', message: string) {
    super(message)
    this.name = 'TraewellingError'
  }
}

export async function checkin(token: string, leg: Leg): Promise<{ statusId: string }> {
  // 1. Fetch departures for the station to find the Träwelling trip ID
  const when = new Date(leg.plannedDeparture).toISOString()
  const encodedOriginName = encodeURIComponent(leg.originName)
  
  const departuresRes = await fetch(
    `https://traewelling.de/api/v1/trains/station/${encodedOriginName}/departures?when=${when}`,
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

  // 2. Find matching departure
  // Träwelling data often formats lineNames/trainNumbers differently, try to match robustly
  const legLineName = leg.lineName?.toLowerCase().replace(/\s+/g, '') || ''
  const legTrainNumber = leg.trainNumber?.toLowerCase().replace(/\s+/g, '') || ''

  const matchingTrain = departures.find((dep: any) => {
    const depLineName = (dep.line.name || '').toLowerCase().replace(/\s+/g, '')
    const depId = (dep.line.id || '').toLowerCase().replace(/\s+/g, '')
    const depFahrtNr = (dep.line.fahrtNr || '').toLowerCase().replace(/\s+/g, '')
    
    return (
      (legLineName && (depLineName.includes(legLineName) || depId.includes(legLineName))) ||
      (legTrainNumber && (depFahrtNr === legTrainNumber || depLineName.includes(legTrainNumber)))
    )
  })

  if (!matchingTrain) {
    throw new TraewellingError('train_not_found', 'Could not find this train in the Träwelling departure board.')
  }

  // 3. Check in
  const checkinPayload = {
    tripId: matchingTrain.tripId,
    lineName: matchingTrain.line.name,
    start: leg.originIbnr || matchingTrain.stop.id,
    destination: leg.destIbnr || undefined,
    departure: leg.plannedDeparture.toISOString(),
    arrival: leg.plannedArrival.toISOString()
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
  } catch (e) {
    throw new TraewellingError('api_error', 'Invalid response from Träwelling.')
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
