'use client'

import dynamic from 'next/dynamic'

const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse" style={{ background: '#0d1f3c' }} /> },
)

const TripMapCard = dynamic(
  () => import('@/components/map/TripMapCard').then((m) => m.TripMapCard),
  { ssr: false, loading: () => <div style={{ height: 280, background: '#0d1117' }} /> },
)

export { TripMap, TripMapCard }