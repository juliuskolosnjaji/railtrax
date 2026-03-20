'use client'

import { useQuery } from '@tanstack/react-query'

interface JourneyNumberData {
  journeyNumber: string | null
  displayName: string | null
}

export function useJourneyNumber(legId: string, enabled = true) {
  return useQuery<JourneyNumberData>({
    queryKey: ['journey-number', legId],
    queryFn: () =>
      fetch(`/api/legs/${legId}/journey-number`)
        .then(r => r.json())
        .then(d => d.data ?? { journeyNumber: null, displayName: null }),
    enabled: enabled && !!legId,
    staleTime: 1000 * 60 * 60 * 24, // 24h — journey numbers don't change
    retry: false,
  })
}
