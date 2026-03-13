'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LegCard } from '@/components/trips/LegCard'
import { LegEditorSheet } from '@/components/trips/LegEditorSheet'
import { useTrip, useDeleteTrip } from '@/hooks/useTrips'

// Dynamically import TripMap to avoid SSR issues with maplibre-gl.
// The `loading` fallback matches the container's fixed height so the map slot
// never collapses while the bundle is downloading (prevents CLS).
const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-zinc-800 animate-pulse" />,
  },
)

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-zinc-700 text-zinc-300',
  active: 'bg-blue-900 text-blue-200',
  completed: 'bg-emerald-900 text-emerald-200',
  cancelled: 'bg-red-900 text-red-300',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: trip, isLoading } = useTrip(id)
  const deleteTrip = useDeleteTrip()
  const qc = useQueryClient()
  const [addLegOpen, setAddLegOpen] = useState(false)

  // Lazily fetch polylines for legs that don't have them yet.
  // After storing, invalidate the trip query so the map gets the updated data
  // in the same page session (without requiring a manual refresh).
  useEffect(() => {
    if (!trip?.legs.length) return
    const hasLegsWithoutPolyline = trip.legs.some(
      (leg) => !leg.polyline && leg.originIbnr && leg.trainNumber,
    )
    if (!hasLegsWithoutPolyline) return

    fetch(`/api/trips/${id}/polylines`)
      .then((res) => res.json())
      .then((json) => {
        if ((json.data?.updated ?? 0) > 0) {
          qc.invalidateQueries({ queryKey: ['trips', id] })
        }
      })
      .catch(() => {})
  }, [id, trip, qc])

  async function handleDeleteTrip() {
    if (!confirm('Delete this trip? This cannot be undone.')) return
    await deleteTrip.mutateAsync(id)
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64 bg-zinc-800" />
        <Skeleton className="h-4 w-40 bg-zinc-800" />
        <Skeleton className="h-[400px] rounded-xl bg-zinc-800 mt-6" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400">Trip not found.</p>
        <Link
          href="/dashboard"
          className="text-zinc-300 hover:text-white text-sm mt-2 inline-block"
        >
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const startDate = formatDate(trip.startDate)
  const endDate = formatDate(trip.endDate)

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-3xl">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            All trips
          </Link>

          {/* Trip header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold text-white">{trip.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                onClick={handleDeleteTrip}
                disabled={deleteTrip.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Badge className={`${STATUS_STYLES[trip.status ?? 'planned']} capitalize`}>
              {trip.status ?? 'planned'}
            </Badge>
            {(startDate || endDate) && (
              <span className="text-sm text-zinc-400">
                {startDate && endDate
                  ? `${startDate} → ${endDate}`
                  : startDate ?? endDate}
              </span>
            )}
            {trip.description && (
              <p className="w-full text-sm text-zinc-400 mt-1">{trip.description}</p>
            )}
          </div>

          {/* Map — always rendered, never conditionally mounted */}
          <div className="rounded-xl overflow-hidden border border-zinc-800 h-[250px] md:h-[400px] mb-8">
            <TripMap legs={trip.legs} />
          </div>

          {/* Legs section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Legs
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({trip.legs.length})
              </span>
            </h2>
            <Button
              size="sm"
              onClick={() => setAddLegOpen(true)}
              className="bg-white text-zinc-900 hover:bg-zinc-100 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add leg
            </Button>
          </div>

          {trip.legs.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 text-sm mb-3">
                No legs yet. Add the first train ride.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddLegOpen(true)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add leg
              </Button>
            </div>
          ) : (
            <div>
              {trip.legs.map((leg) => (
                <LegCard key={leg.id} leg={leg} tripId={trip.id} />
              ))}
              {/* Final dot */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                </div>
                <p className="text-sm text-zinc-600 pb-2">
                  {trip.legs[trip.legs.length - 1]?.destName}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <LegEditorSheet tripId={id} open={addLegOpen} onOpenChange={setAddLegOpen} />
    </div>
  )
}
