import { z } from 'zod'

export const TRIP_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const tripRecurrenceSchema = z.object({
  daysOfWeek: z.array(z.int().min(1).max(7)).min(1).max(7),
  startsOn: z.string().regex(ISO_DATE_RE).optional(),
  endsOn: z.string().regex(ISO_DATE_RE).optional(),
  timezone: z.string().min(1).max(100).optional(),
}).transform((value) => ({
  ...value,
  daysOfWeek: Array.from(new Set(value.daysOfWeek)).sort((a, b) => a - b),
})).refine(
  (data) => {
    if (!data.startsOn || !data.endsOn) return true
    return data.startsOn <= data.endsOn
  },
  { message: 'Recurrence end date must be on or after the start date', path: ['endsOn'] },
)

const tripObjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isWorkTrip: z.boolean().optional(),
  recurrence: tripRecurrenceSchema.optional(),
  // No .default() — the default is set in the form's defaultValues.
  // In Zod v4, z.infer<> is the input type, so .default() would make
  // the field optional and break the useForm<CreateTripInput> generic.
  status: z.enum(TRIP_STATUSES),
})

export const createTripSchema = tripObjectSchema.refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true
    return new Date(data.startDate) <= new Date(data.endDate)
  },
  { message: 'Enddatum muss nach dem Startdatum liegen', path: ['endDate'] }
)

export const updateTripSchema = tripObjectSchema.partial()

export type CreateTripInput = z.infer<typeof createTripSchema>
export type UpdateTripInput = z.infer<typeof updateTripSchema>
