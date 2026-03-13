export interface HafasStation {
  id: string        // IBNR e.g. "8000261"
  name: string
  lat?: number
  lon?: number
}

export interface HafasDeparture {
  tripId: string
  lineName: string      // "ICE 724"
  direction: string     // final destination name
  platform: string | null
  plannedWhen: string   // ISO string
  delay: number         // seconds, 0 if on time
  cancelled: boolean
  operator: string | null
}

export interface HafasStopover {
  stationId: string
  stationName: string
  lat: number | null
  lon: number | null
  plannedArrival: string | null
  plannedDeparture: string | null
  delay: number          // seconds
  platform: string | null
  cancelled: boolean
}

export interface HafasJourney {
  tripId: string
  lineName: string      // "ICE 724"
  operator: string | null
  stopovers: HafasStopover[]
  polyline: [number, number][] | null
}
