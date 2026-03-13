'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TripCard } from '@/components/trips/TripCard'
import { NewTripSheet } from '@/components/trips/NewTripSheet'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useTrips } from '@/hooks/useTrips'
import { useEntitlements } from '@/hooks/useEntitlements'

export default function DashboardPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const { data: trips, isLoading } = useTrips()
  const { getLimit } = useEntitlements()

  const maxTrips = getLimit('maxTrips')
  const atLimit = maxTrips !== Infinity && (trips?.length ?? 0) >= maxTrips

  function handleNewTrip() {
    if (atLimit) {
      setUpgradeOpen(true)
    } else {
      setSheetOpen(true)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My trips</h1>
          {maxTrips !== Infinity && (
            <p className="text-sm text-zinc-500 mt-0.5">
              {trips?.length ?? 0} / {maxTrips} trips used
            </p>
          )}
        </div>
        <Button
          onClick={handleNewTrip}
          className="bg-white text-zinc-900 hover:bg-zinc-100 gap-2"
        >
          <Plus className="h-4 w-4" />
          New trip
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-zinc-800" />
          ))}
        </div>
      ) : !trips || trips.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🚂</p>
          <p className="text-zinc-400">No trips yet. Create your first one!</p>
          <Button
            onClick={handleNewTrip}
            variant="outline"
            className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            New trip
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      <NewTripSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <UpgradeModal
        feature="journal"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </div>
  )
}
