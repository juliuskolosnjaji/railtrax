import test from 'node:test'
import assert from 'node:assert/strict'
import { getCurrentOrNextWorkTrip, resolveWorkTripOccurrence } from '@/lib/work-trips'

const recurringTrip = {
  id: 'trip-1',
  title: 'Morning commute',
  description: null,
  status: 'planned',
  isWorkTrip: true,
  recurrenceRule: {
    daysOfWeek: [1, 2, 3, 4, 5],
    timezone: 'Europe/Berlin',
  },
  recurrenceTimezone: 'Europe/Berlin',
  startDate: '2026-05-01T00:00:00.000Z',
  endDate: null,
  legs: [
    {
      id: 'leg-1',
      tripId: 'trip-1',
      originName: 'Home',
      originIbnr: '8000105',
      originLat: 0,
      originLon: 0,
      destName: 'Office',
      destIbnr: '8000207',
      destLat: 0,
      destLon: 0,
      plannedDeparture: '2026-05-04T06:15:00.000Z',
      plannedArrival: '2026-05-04T06:55:00.000Z',
      operator: 'DB',
      trainNumber: 'ICE 123',
      lineName: 'ICE 123',
      tripIdVendo: 'vendo-1',
      position: 0,
    },
  ],
}

test('resolveWorkTripOccurrence shifts a recurring commute onto the requested weekday', () => {
  const referenceAt = new Date('2026-05-05T05:30:00.000Z')
  const occurrence = resolveWorkTripOccurrence(recurringTrip, '2026-05-05', referenceAt)

  assert.ok(occurrence)
  assert.equal(occurrence.type, 'recurring')
  assert.equal(occurrence.date, '2026-05-05')
  assert.equal(occurrence.status, 'upcoming')
  assert.equal(occurrence.legs.length, 1)
  assert.equal(occurrence.legs[0].tripIdVendo, 'vendo-1')
  assert.match(occurrence.plannedDeparture, /^2026-05-05T/)
})

test('resolveWorkTripOccurrence skips non-recurring weekdays', () => {
  const occurrence = resolveWorkTripOccurrence(
    recurringTrip,
    '2026-05-10',
    new Date('2026-05-10T07:00:00.000Z'),
  )

  assert.equal(occurrence, null)
})

test('getCurrentOrNextWorkTrip returns an active work trip before later upcoming ones', () => {
  const activeReference = new Date('2026-05-05T06:30:00.000Z')
  const laterTrip = {
    ...recurringTrip,
    id: 'trip-2',
    title: 'Evening commute',
    legs: [
      {
        ...recurringTrip.legs[0],
        id: 'leg-2',
        tripId: 'trip-2',
        plannedDeparture: '2026-05-04T16:15:00.000Z',
        plannedArrival: '2026-05-04T16:55:00.000Z',
      },
    ],
  }

  const current = getCurrentOrNextWorkTrip([laterTrip, recurringTrip], activeReference)

  assert.ok(current)
  assert.equal(current.trip.id, 'trip-1')
  assert.equal(current.occurrence.status, 'active')
})
