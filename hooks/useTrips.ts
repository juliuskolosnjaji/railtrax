'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateTripInput, UpdateTripInput } from '@/lib/validators/trip'
import type { CreateLegInput, UpdateLegInput } from '@/lib/validators/leg'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TripSummary {
  id: string
  title: string
  description: string | null
  status: string | null
  startDate: string | null
  endDate: string | null
  isPublic: boolean
  shareToken: string | null
  createdAt: string
  _count: { legs: number }
}

export interface Leg {
  id: string
  tripId: string
  position: number
  originName: string
  originIbnr: string | null
  originLat: number | null
  originLon: number | null
  plannedDeparture: string
  actualDeparture: string | null
  destName: string
  destIbnr: string | null
  destLat: number | null
  destLon: number | null
  plannedArrival: string
  actualArrival: string | null
  operator: string | null
  lineName: string | null
  trainType: string | null
  trainNumber: string | null
  status: string | null
  delayMinutes: number
  cancelled: boolean
  distanceKm: number | null
  tripIdVendo: string | null    // Vendo/HAFAS trip ID — used for direct polyline fetch
  // GeoJSON coordinate pairs [lon, lat][], stored as JSON in DB
  polyline: [number, number][] | null
  seat: string | null
  notes: string | null
  traewellingStatusId: string | null
}

export interface TripDetail extends TripSummary {
  legs: Leg[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  
  let json
  try {
    json = await res.json()
  } catch (err) {
    if (!res.ok) {
      throw Object.assign(new Error(`HTTP Error ${res.status}: ${res.statusText}`), { status: res.status })
    }
    throw new Error('Invalid JSON response from server')
  }

  if (!res.ok) {
    const errorMsg = json.message || json.error || 'Request failed'
    throw Object.assign(new Error(errorMsg), { status: res.status, json })
  }
  return json.data as T
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export function useTrips() {
  return useQuery<TripSummary[]>({
    queryKey: ['trips'],
    queryFn: () => apiFetch('/api/trips'),
  })
}

export function useTrip(id: string) {
  return useQuery<TripDetail>({
    queryKey: ['trips', id],
    queryFn: () => apiFetch(`/api/trips/${id}`),
    enabled: !!id,
  })
}

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTripInput) =>
      apiFetch<TripSummary>('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}

export function useUpdateTrip(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateTripInput) =>
      apiFetch<TripSummary>(`/api/trips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['trips', id] })
    },
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/trips/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}

// ─── Legs ─────────────────────────────────────────────────────────────────────

export function useCreateLeg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLegInput) =>
      apiFetch<Leg>('/api/legs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['trips', vars.tripId] })
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useUpdateLeg(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLegInput }) =>
      apiFetch<Leg>(`/api/legs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', tripId] }),
  })
}

export function useDeleteLeg(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (legId: string) =>
      apiFetch(`/api/legs/${legId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips', tripId] })
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useShareTrip(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/trips/${tripId}/share`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips', tripId] })
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useUnshareTrip(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/trips/${tripId}/share`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips', tripId] })
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
