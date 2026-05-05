const DEFAULT_TIMEZONE = 'Europe/Berlin'
const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface TripRecurrence {
  daysOfWeek: number[]
  startsOn?: string
  endsOn?: string
  timezone?: string
}

export interface WorkTripLegLike {
  id: string
  tripId?: string
  originName: string
  originIbnr: string | null
  originLat: number | null
  originLon: number | null
  destName: string
  destIbnr: string | null
  destLat: number | null
  destLon: number | null
  plannedDeparture: Date | string
  plannedArrival: Date | string
  operator: string | null
  trainNumber: string | null
  trainType?: string | null
  lineName: string | null
  tripIdVendo?: string | null
  platformPlanned?: string | null
  platformActual?: string | null
  arrivalPlatformPlanned?: string | null
  arrivalPlatformActual?: string | null
  status?: string | null
  delayMinutes?: number | null
  cancelled?: boolean | null
  notes?: string | null
  seat?: string | null
  position?: number
}

export interface WorkTripLike {
  id: string
  title: string
  description?: string | null
  status?: string | null
  isWorkTrip: boolean
  recurrenceRule?: unknown
  recurrenceTimezone?: string | null
  startDate?: Date | string | null
  endDate?: Date | string | null
  legs: WorkTripLegLike[]
}

export interface ResolvedWorkTripLeg extends Omit<WorkTripLegLike, 'plannedDeparture' | 'plannedArrival'> {
  plannedDeparture: string
  plannedArrival: string
}

export interface WorkTripOccurrence {
  type: 'single' | 'recurring'
  status: 'upcoming' | 'active' | 'completed'
  timezone: string
  date: string
  plannedDeparture: string
  plannedArrival: string
  durationMinutes: number
  legs: ResolvedWorkTripLeg[]
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function partsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const mapped = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(mapped.year),
    month: Number(mapped.month),
    day: Number(mapped.day),
    hour: Number(mapped.hour),
    minute: Number(mapped.minute),
    second: Number(mapped.second),
  }
}

function localDateKey(date: Date, timeZone: string): string {
  const parts = partsInTimeZone(date, timeZone)
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return shifted.toISOString().slice(0, 10)
}

function isoWeekday(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return dayOfWeek === 0 ? 7 : dayOfWeek
}

function zonedDateTimeToUtc(dateKey: string, time: { hour: number; minute: number; second: number }, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day, time.hour, time.minute, time.second))
  const actual = partsInTimeZone(guess, timeZone)
  const desiredTs = Date.UTC(year, month - 1, day, time.hour, time.minute, time.second)
  const actualTs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
  return new Date(guess.getTime() + (desiredTs - actualTs))
}

export function parseTripRecurrence(value: unknown, fallbackTimezone?: string | null): TripRecurrence | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<TripRecurrence>
  if (!Array.isArray(candidate.daysOfWeek) || candidate.daysOfWeek.length === 0) return null

  const daysOfWeek = Array.from(
    new Set(
      candidate.daysOfWeek.filter((day): day is number =>
        Number.isInteger(day) && day >= 1 && day <= 7,
      ),
    ),
  ).sort((a, b) => a - b)

  if (daysOfWeek.length === 0) return null

  return {
    daysOfWeek,
    startsOn: candidate.startsOn,
    endsOn: candidate.endsOn,
    timezone: candidate.timezone ?? fallbackTimezone ?? DEFAULT_TIMEZONE,
  }
}

function isWithinDateBounds(dateKey: string, recurrence: TripRecurrence, trip: WorkTripLike): boolean {
  const startsOn = recurrence.startsOn ?? (trip.startDate ? asDate(trip.startDate)?.toISOString().slice(0, 10) : undefined)
  const endsOn = recurrence.endsOn ?? (trip.endDate ? asDate(trip.endDate)?.toISOString().slice(0, 10) : undefined)
  if (startsOn && dateKey < startsOn) return false
  if (endsOn && dateKey > endsOn) return false
  return true
}

function buildOccurrenceFromBase(
  trip: WorkTripLike,
  dateKey: string,
  timeZone: string,
  referenceAt: Date,
  type: 'single' | 'recurring',
): WorkTripOccurrence | null {
  const legs = [...trip.legs]
    .map((leg) => ({
      ...leg,
      plannedDepartureDate: asDate(leg.plannedDeparture),
      plannedArrivalDate: asDate(leg.plannedArrival),
    }))
    .filter((leg) => leg.plannedDepartureDate && leg.plannedArrivalDate)
    .sort((a, b) => a.plannedDepartureDate!.getTime() - b.plannedDepartureDate!.getTime())

  if (legs.length === 0) return null

  const firstDeparture = legs[0].plannedDepartureDate!
  const lastArrival = legs[legs.length - 1].plannedArrivalDate!
  const baseLocalTime = partsInTimeZone(firstDeparture, timeZone)
  const occurrenceStart = type === 'single'
    ? firstDeparture
    : zonedDateTimeToUtc(dateKey, {
        hour: baseLocalTime.hour,
        minute: baseLocalTime.minute,
        second: baseLocalTime.second,
      }, timeZone)

  const occurrenceLegs = legs.map((leg) => {
    const departureOffset = leg.plannedDepartureDate!.getTime() - firstDeparture.getTime()
    const arrivalOffset = leg.plannedArrivalDate!.getTime() - firstDeparture.getTime()
    const plannedDeparture = new Date(occurrenceStart.getTime() + departureOffset)
    const plannedArrival = new Date(occurrenceStart.getTime() + arrivalOffset)

    return {
      id: leg.id,
      tripId: leg.tripId,
      originName: leg.originName,
      originIbnr: leg.originIbnr,
      originLat: leg.originLat,
      originLon: leg.originLon,
      destName: leg.destName,
      destIbnr: leg.destIbnr,
      destLat: leg.destLat,
      destLon: leg.destLon,
      operator: leg.operator,
      trainNumber: leg.trainNumber,
      trainType: leg.trainType ?? null,
      lineName: leg.lineName,
      tripIdVendo: leg.tripIdVendo ?? null,
      platformPlanned: leg.platformPlanned ?? null,
      platformActual: leg.platformActual ?? null,
      arrivalPlatformPlanned: leg.arrivalPlatformPlanned ?? null,
      arrivalPlatformActual: leg.arrivalPlatformActual ?? null,
      status: leg.status ?? null,
      delayMinutes: leg.delayMinutes ?? 0,
      cancelled: leg.cancelled ?? false,
      notes: leg.notes ?? null,
      seat: leg.seat ?? null,
      position: leg.position,
      plannedDeparture: plannedDeparture.toISOString(),
      plannedArrival: plannedArrival.toISOString(),
    }
  })

  const occurrenceEnd = new Date(occurrenceStart.getTime() + (lastArrival.getTime() - firstDeparture.getTime()))
  const status =
    referenceAt < occurrenceStart
      ? 'upcoming'
      : referenceAt > occurrenceEnd
        ? 'completed'
        : 'active'

  return {
    type,
    status,
    timezone: timeZone,
    date: dateKey,
    plannedDeparture: occurrenceStart.toISOString(),
    plannedArrival: occurrenceEnd.toISOString(),
    durationMinutes: Math.max(0, Math.round((occurrenceEnd.getTime() - occurrenceStart.getTime()) / 60000)),
    legs: occurrenceLegs,
  }
}

export function resolveWorkTripOccurrence(
  trip: WorkTripLike,
  dateKey: string,
  referenceAt = new Date(),
): WorkTripOccurrence | null {
  if (trip.legs.length === 0) return null

  const recurrence = parseTripRecurrence(trip.recurrenceRule, trip.recurrenceTimezone)
  if (recurrence) {
    if (!recurrence.daysOfWeek.includes(isoWeekday(dateKey))) return null
    if (!isWithinDateBounds(dateKey, recurrence, trip)) return null
    return buildOccurrenceFromBase(trip, dateKey, recurrence.timezone ?? DEFAULT_TIMEZONE, referenceAt, 'recurring')
  }

  const firstDeparture = asDate(trip.legs[0]?.plannedDeparture)
  if (!firstDeparture) return null
  const timeZone = trip.recurrenceTimezone ?? DEFAULT_TIMEZONE
  if (dateKey !== localDateKey(firstDeparture, timeZone)) return null
  return buildOccurrenceFromBase(trip, dateKey, timeZone, referenceAt, 'single')
}

export function getCurrentOrNextWorkTrip(
  trips: WorkTripLike[],
  referenceAt = new Date(),
): { trip: WorkTripLike; occurrence: WorkTripOccurrence } | null {
  const candidates: Array<{ trip: WorkTripLike; occurrence: WorkTripOccurrence }> = []

  for (const trip of trips) {
    if (!trip.isWorkTrip || trip.legs.length === 0) continue
    const timeZone = parseTripRecurrence(trip.recurrenceRule, trip.recurrenceTimezone)?.timezone
      ?? trip.recurrenceTimezone
      ?? DEFAULT_TIMEZONE
    const startDateKey = localDateKey(referenceAt, timeZone)
    const offsets = trip.recurrenceRule ? [-1, 0, 1, 2, 3, 4, 5, 6, 7] : [0]

    for (const offset of offsets) {
      const occurrence = resolveWorkTripOccurrence(trip, shiftDateKey(startDateKey, offset), referenceAt)
      if (occurrence) candidates.push({ trip, occurrence })
    }
  }

  const active = candidates
    .filter((candidate) => candidate.occurrence.status === 'active')
    .sort((a, b) => a.occurrence.plannedDeparture.localeCompare(b.occurrence.plannedDeparture))[0]
  if (active) return active

  return candidates
    .filter((candidate) => candidate.occurrence.status === 'upcoming')
    .sort((a, b) => a.occurrence.plannedDeparture.localeCompare(b.occurrence.plannedDeparture))[0] ?? null
}

export function listWorkTripOccurrences(
  trip: WorkTripLike,
  fromDate: string,
  days: number,
  referenceAt = new Date(),
): WorkTripOccurrence[] {
  const occurrences: WorkTripOccurrence[] = []
  for (let offset = 0; offset < days; offset += 1) {
    const occurrence = resolveWorkTripOccurrence(trip, shiftDateKey(fromDate, offset), referenceAt)
    if (occurrence) occurrences.push(occurrence)
  }
  return occurrences
}

export function getActiveOccurrenceLegId(occurrence: WorkTripOccurrence, referenceAt = new Date()): string | null {
  const now = referenceAt.getTime()
  const activeLeg = occurrence.legs.find((leg) => {
    const dep = new Date(leg.plannedDeparture).getTime()
    const arr = new Date(leg.plannedArrival).getTime()
    return dep <= now && now <= arr
  })

  return activeLeg?.id ?? null
}

export function getTripDateKey(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return localDateKey(date, timeZone)
}

export { DEFAULT_TIMEZONE, MS_PER_DAY }
