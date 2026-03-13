'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './useTrips'

export function useTraewellingStatus() {
  return useQuery<{ connected: boolean; username: string | null }>({
    queryKey: ['traewelling', 'status'],
    queryFn: () => apiFetch('/api/settings/traewelling/status'),
  })
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
