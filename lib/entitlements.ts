export type Plan = 'free' | 'plus' | 'pro'

export interface Limits {
  maxTrips: number         // Infinity = unlimited
  maxLegsPerTrip: number
  maxPhotosMb: number
  maxCustomRoutes: number
  aiSuggestionsPerMonth: number
  apiAccess: boolean
  journal: boolean
  ticketWallet: boolean
  fullStats: boolean
  notifications: boolean
  interrailTracker: boolean
  collaborativeTrips: boolean
  poiAlongRoute: boolean
}

export const PLAN_LIMITS: Record<Plan, Limits> = {
  free: {
    maxTrips: 3,
    maxLegsPerTrip: 10,
    maxPhotosMb: 0,
    maxCustomRoutes: 1,
    aiSuggestionsPerMonth: 0,
    apiAccess: false,
    journal: false,
    ticketWallet: false,
    fullStats: false,
    notifications: false,
    interrailTracker: false,
    collaborativeTrips: false,
    poiAlongRoute: false,
  },
  plus: {
    maxTrips: Infinity,
    maxLegsPerTrip: Infinity,
    maxPhotosMb: 500,
    maxCustomRoutes: Infinity,
    aiSuggestionsPerMonth: 0,
    apiAccess: false,
    journal: true,
    ticketWallet: true,
    fullStats: true,
    notifications: true,
    interrailTracker: true,
    collaborativeTrips: false,
    poiAlongRoute: true,
  },
  pro: {
    maxTrips: Infinity,
    maxLegsPerTrip: Infinity,
    maxPhotosMb: 5000,
    maxCustomRoutes: Infinity,
    aiSuggestionsPerMonth: 10,
    apiAccess: true,
    journal: true,
    ticketWallet: true,
    fullStats: true,
    notifications: true,
    interrailTracker: true,
    collaborativeTrips: true,
    poiAlongRoute: true,
  },
}

export function getPlan(userMetadata: { plan?: string }): Plan {
  const p = userMetadata?.plan
  if (p === 'plus' || p === 'pro') return p
  return 'free'
}

type BooleanFeature = keyof Omit<
  Limits,
  'maxTrips' | 'maxLegsPerTrip' | 'maxPhotosMb' | 'maxCustomRoutes' | 'aiSuggestionsPerMonth'
>

export function can(plan: Plan, feature: BooleanFeature): boolean {
  return PLAN_LIMITS[plan][feature]
}

type NumericLimit = 'maxTrips' | 'maxLegsPerTrip' | 'maxPhotosMb' | 'maxCustomRoutes' | 'aiSuggestionsPerMonth'

export function getLimit(plan: Plan, limit: NumericLimit): number {
  return PLAN_LIMITS[plan][limit]
}
