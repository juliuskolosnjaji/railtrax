'use client'

import dynamic from 'next/dynamic'

const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" /> },
)

export { TripMap }