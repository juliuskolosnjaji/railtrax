import { z } from 'zod'

export const OPERATORS = ['DB', 'SBB', 'ÖBB', 'SNCF', 'Eurostar', 'NS', 'Renfe', 'other'] as const
export const LEG_STATUSES = ['planned', 'checked_in', 'completed', 'cancelled'] as const

export const createLegSchema = z.object({
  tripId: z.string().uuid(),
  // position is auto-calculated server-side if not provided
  originName: z.string().min(1, 'Origin is required').max(200),
  originIbnr: z.string().optional(),
  originLat: z.number().optional(),
  originLon: z.number().optional(),
  // datetime-local format "YYYY-MM-DDTHH:MM" or ISO string — server normalises to Date
  plannedDeparture: z.string().min(1, 'Departure time is required'),
  destName: z.string().min(1, 'Destination is required').max(200),
  destIbnr: z.string().optional(),
  destLat: z.number().optional(),
  destLon: z.number().optional(),
  plannedArrival: z.string().min(1, 'Arrival time is required'),
  operator: z.enum(OPERATORS).optional(),
  trainNumber: z.string().max(50).optional(),
  trainType: z.string().max(50).optional(),
  lineName: z.string().max(100).optional(),
  tripIdVendo: z.string().optional(),
  seat: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateLegSchema = createLegSchema.omit({ tripId: true }).partial()

export type CreateLegInput = z.infer<typeof createLegSchema>
export type UpdateLegInput = z.infer<typeof updateLegSchema>
