import { z } from 'zod'

export const createJournalEntrySchema = z.object({
  trip_id: z.string().uuid(),
  leg_id: z.string().uuid().nullable().optional(),
  body: z.any(), // Tiptap JSON — internal structure not validated
  mood: z.string().max(20).nullable().optional(),
  location_name: z.string().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
})

export const updateJournalEntrySchema = z.object({
  body: z.any().optional(),
  mood: z.string().max(20).nullable().optional(),
  location_name: z.string().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
})

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>
