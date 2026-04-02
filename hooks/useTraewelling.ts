'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './useTrips'
import type { Leg } from './useTrips'

export function useTraewellingStatus() {
  return useQuery<{ connected: boolean; username: string | null }>({
    queryKey: ['traewelling', 'status'],
    queryFn: () => apiFetch('/api/settings/traewelling/status'),
  })
}

export function useTraewellingAutoCheckinPreference() {
  const qc = useQueryClient()
  const query = useQuery<{ autoCheckin: boolean }>({
    queryKey: ['traewelling', 'auto-checkin'],
    queryFn: () => apiFetch('/api/settings/traewelling/auto-checkin'),
  })
  const mutation = useMutation({
    mutationFn: (autoCheckin: boolean) =>
      apiFetch<{ autoCheckin: boolean }>('/api/settings/traewelling/auto-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoCheckin }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traewelling', 'auto-checkin'] }),
  })
  return { query, mutation }
}

export function useTraewellingCheckin(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (legId: string) =>
      apiFetch(`/api/legs/${legId}/checkin`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips', tripId] })
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

// Auto check-in: fires when autoCheckin pref is on, Träwelling is connected,
// and a leg's departure is within AUTO_CHECKIN_WINDOW_MINS (before departure).
const AUTO_CHECKIN_WINDOW_MINS = 20

export function useTraewellingAutoCheckin(tripId: string, legs: Leg[]) {
  const { data: status } = useTraewellingStatus()
  const { query: prefQuery } = useTraewellingAutoCheckinPreference()
  const checkin = useTraewellingCheckin(tripId)
  // Track which leg IDs we've already triggered to avoid double-firing
  const triggered = useRef(new Set<string>())

  useEffect(() => {
    if (!status?.connected || !prefQuery.data?.autoCheckin) return

    const now = Date.now()
    for (const leg of legs) {
      if (triggered.current.has(leg.id)) continue
      const isCheckedIn = leg.status === 'checked_in' || leg.traewellingStatusId != null
      if (isCheckedIn) continue

      const minsUntilDep = (new Date(leg.plannedDeparture).getTime() - now) / 60000
      if (minsUntilDep >= -5 && minsUntilDep <= AUTO_CHECKIN_WINDOW_MINS) {
        triggered.current.add(leg.id)
        checkin.mutate(leg.id)
      }
    }
  }, [status, prefQuery.data, legs, checkin])
}
