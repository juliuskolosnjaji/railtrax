'use client'

import { useUser } from '@/hooks/useUser'
import { can, getLimit, type Plan } from '@/lib/entitlements'
import type { Limits } from '@/lib/entitlements'

type BooleanFeature = keyof Omit<
  Limits,
  'maxTrips' | 'maxLegsPerTrip' | 'maxPhotosMb' | 'maxCustomRoutes' | 'aiSuggestionsPerMonth'
>

type NumericLimit = 'maxTrips' | 'maxLegsPerTrip' | 'maxPhotosMb' | 'maxCustomRoutes' | 'aiSuggestionsPerMonth'

export function useEntitlements() {
  const { plan } = useUser()

  return {
    plan,
    can: (feature: BooleanFeature) => can(plan, feature),
    getLimit: (limit: NumericLimit) => getLimit(plan, limit),
  }
}
