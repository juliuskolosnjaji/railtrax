'use client'

import dynamic from 'next/dynamic'
import type { Leg } from '@/hooks/useTrips'

// Dynamically import TripMap with SSR disabled to avoid hydration errors
const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  { ssr: false }
)

interface TripMapPreviewProps {
  legs: Leg[]
  className?: string
}

export function TripMapPreview({ legs, className }: TripMapPreviewProps) {
  return (
    <div className={className}>
      <TripMap legs={legs} preview />
    </div>
  )
}