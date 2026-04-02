import { z } from 'zod'

export const TRIP_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const

const tripObjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
