export interface FormationResult {
  series: string
  operator: string
  topSpeedKmh: number | null
  hasWifi: boolean
  hasBistro: boolean
  hasBike: boolean
  hasWheelchair: boolean
  description: string | null
  wikipediaUrl: string | null
  imageUrl: string | null
  source: 'marudor' | 'swiss-otd' | 'ns' | 'sncf' | 'rtt' | 'static'
  trainName: string | null
}

/** Minimum leg fields needed by getFormation — matches the Prisma Leg model (camelCase). */
export interface FormationLeg {
  operator: string | null
  lineName: string | null
  trainNumber: string | null
  plannedDeparture: Date
  originIbnr: string | null
}
