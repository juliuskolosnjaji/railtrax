'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateJournalEntryInput, UpdateJournalEntryInput } from '@/lib/validators/journal'

export interface JournalPhoto {
  id: string
  entryId: string
  url: string
  caption: string | null
  position: number | null
}

export interface JournalEntry {
  id: string
  tripId: string
  legId: string | null
  userId: string
  body: string | null  // JSON string (Tiptap doc)
  mood: string | null
  locationName: string | null
  lat: number | null
  lon: number | null
  createdAt: string
  photos: JournalPhoto[]
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? json.error ?? 'Request failed')
  return json.data
}

export function useJournalEntries(tripId: string) {
  return useQuery<JournalEntry[]>({
    queryKey: ['journal', tripId],
    queryFn: () => apiFetch(`/api/journal?tripId=${tripId}`),
  })
}

export function useCreateJournalEntry(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) =>
      apiFetch<JournalEntry>('/api/journal', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', tripId] }),
  })
}

export function useUpdateJournalEntry(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateJournalEntryInput & { id: string }) =>
      apiFetch<JournalEntry>(`/api/journal/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', tripId] }),
  })
}

export function useDeleteJournalEntry(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/journal/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', tripId] }),
  })
}
