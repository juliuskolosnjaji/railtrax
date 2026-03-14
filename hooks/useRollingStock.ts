import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MarudorTrainInfo } from '@/lib/marudor'
import type { FormationResult } from '@/lib/formation'

export interface RollingStock {
  id: string
  operator: string
  series: string
  uicClass?: string | null
  manufacturer?: string | null
  introducedYear?: number | null
  maxSpeedKmh?: number | null
  seats1st?: number | null
  seats2nd?: number | null
  hasBistro?: boolean | null
  hasWifi?: boolean | null
  hasWheelchair?: boolean | null
  hasBikeSpace?: boolean | null
  powerSystem?: string | null
  traction?: string | null
  description?: string | null
  photoUrl?: string | null
  wikiUrl?: string | null
  dataSource?: string | null
}

export interface LegRollingStock {
  legId: string
  rollingStockId: string
  setNumber?: string | null
  confirmed: boolean
  source?: string | null
  rollingStock?: RollingStock
}

// Search rolling stock
export function useRollingStockSearch(query?: string, operator?: string) {
  return useQuery({
    queryKey: ['rolling-stock', 'search', query, operator],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (operator) params.set('operator', operator)
      
      const response = await fetch(`/api/rolling-stock?${params}`)
      if (!response.ok) throw new Error('Failed to fetch rolling stock')
      const data = await response.json()
      return data.data as RollingStock[]
    },
    enabled: !!query || !!operator,
  })
}

// Get rolling stock by ID
export function useRollingStock(id: string) {
  return useQuery({
    queryKey: ['rolling-stock', id],
    queryFn: async () => {
      const response = await fetch(`/api/rolling-stock/${id}`)
      if (!response.ok) throw new Error('Failed to fetch rolling stock')
      const data = await response.json()
      return data.data as RollingStock & {
        legs: any[]
        _count: { legs: number }
      }
    },
    enabled: !!id,
  })
}

// Get rolling stock for a leg — returns { formation, manualLink }
export function useLegRollingStock(legId: string) {
  return useQuery({
    queryKey: ['legs', legId, 'rolling-stock'],
    queryFn: async () => {
      const response = await fetch(`/api/legs/${legId}/rolling-stock`)
      if (!response.ok) throw new Error('Failed to fetch leg rolling stock')
      const data = await response.json()
      return data.data as { formation: FormationResult | null; manualLink: LegRollingStock | null }
    },
    enabled: !!legId,
    staleTime: 1000 * 60 * 60 * 6, // 6h — mirrors server cache TTL
  })
}

/** Convenience: just the FormationResult part of useLegRollingStock. */
export function useFormation(legId: string) {
  const q = useLegRollingStock(legId)
  return {
    ...q,
    data: q.data?.formation ?? null,
  }
}

// Link rolling stock to leg
export function useLinkRollingStock(legId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      rollingStockId: string
      setNumber?: string
      source?: string
    }) => {
      const response = await fetch(`/api/legs/${legId}/rolling-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to link rolling stock')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legs', legId, 'rolling-stock'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

// Report rolling stock for leg (user correction)
export function useReportRollingStock(legId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      rollingStockId: string
      setNumber?: string
    }) => {
      const response = await fetch(`/api/legs/${legId}/rolling-stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          source: 'user_report',
        }),
      })
      if (!response.ok) throw new Error('Failed to report rolling stock')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legs', legId, 'rolling-stock'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

// Remove rolling stock link
export function useUnlinkRollingStock(legId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/legs/${legId}/rolling-stock`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to unlink rolling stock')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legs', legId, 'rolling-stock'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

/**
 * Fetch Marudor train info for a DB train number.
 * Only fires when operator looks like DB and a train number is provided.
 */
export function useMarudorTrainInfo(
  trainNumber: string | null | undefined,
  departure: string | null | undefined,
  operator: string | null | undefined,
) {
  const isDB = !operator || /^DB/i.test(operator)

  return useQuery({
    queryKey: ['marudor', trainNumber, departure],
    queryFn: async () => {
      const params = new URLSearchParams({
        number: trainNumber!,
        departure: departure!,
      })
      const res = await fetch(`/api/trains/marudor?${params}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data as MarudorTrainInfo | null
    },
    enabled: isDB && !!trainNumber && !!departure,
    staleTime: 1000 * 60 * 60 * 2, // 2h — mirrors server cache
    retry: false,
  })
}