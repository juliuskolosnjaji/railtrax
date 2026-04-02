'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Check, ArrowRight, Train } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTrips, apiFetch, type TripSummary } from '@/hooks/useTrips'
import type { CreateLegInput } from '@/lib/validators/leg'

// ─── Operator mapping ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const OPERATORS = ['DB', 'SBB', 'ÖBB', 'SNCF', 'Eurostar', 'NS', 'Renfe', 'other'] as const

function toOperatorEnum(op: string | null): typeof OPERATORS[number] | undefined {
  if (!op) return undefined
  const o = op.toLowerCase()
  if (o.includes('db') || o.includes('deutsche bahn')) return 'DB'
  if (o.includes('sbb') || o.includes('schweizerisch')) return 'SBB'
  if (o.includes('öbb') || o.includes('oebb') || o.includes('austrian')) return 'ÖBB'
  if (o.includes('sncf')) return 'SNCF'
  if (o.includes('eurostar')) return 'Eurostar'
  if (/\bns\b/.test(o)) return 'NS'
  if (o.includes('renfe')) return 'Renfe'
  return 'other'
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AddToTripSheetProps {
  journey: AddableJourney | null
  onClose: () => void
}

interface AddableJourneyLeg {
  origin: string
  originIbnr: string | null
  originLat?: number | null
  originLon?: number | null
  destination: string
  destinationIbnr: string | null
  destinationLat?: number | null
  destinationLon?: number | null
  departure: string
  arrival: string
  operator: string | null
  trainNumber: string
  tripId?: string | null
}

interface AddableJourney {
  legs: AddableJourneyLeg[]
}

function formatJourneySummary(journey: AddableJourney | null) {
  if (!journey || journey.legs.length === 0) return null
  const firstLeg = journey.legs[0]
  const lastLeg = journey.legs[journey.legs.length - 1]
  return {
    title: `${firstLeg.origin} -> ${lastLeg.destination}`,
    meta: `${journey.legs.length} Abschnitt${journey.legs.length !== 1 ? 'e' : ''} · ${new Date(firstLeg.departure).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${new Date(lastLeg.arrival).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
  }
}

export function AddToTripSheet({ journey, onClose }: AddToTripSheetProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: trips, isLoading: tripsLoading } = useTrips()

  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const summary = formatJourneySummary(journey)

  async function postLegs(tripId: string) {
    if (!journey) return
    for (const leg of journey.legs) {
      const payload: CreateLegInput = {
        tripId,
        originName: leg.origin,
        originIbnr: leg.originIbnr ?? undefined,
        originLat: leg.originLat ?? undefined,
        originLon: leg.originLon ?? undefined,
        plannedDeparture: leg.departure,
        destName: leg.destination,
        destIbnr: leg.destinationIbnr ?? undefined,
        destLat: leg.destinationLat ?? undefined,
        destLon: leg.destinationLon ?? undefined,
        plannedArrival: leg.arrival,
        operator: toOperatorEnum(leg.operator),
        trainNumber: leg.trainNumber,
        lineName: leg.trainNumber,
        tripIdVendo: leg.tripId ?? undefined,
      }
      await apiFetch('/api/legs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    qc.invalidateQueries({ queryKey: ['trips', tripId] })
    qc.invalidateQueries({ queryKey: ['trips'] })
  }

  async function handleSelectTrip(tripId: string) {
    setSubmitting(true)
    setError(null)
    try {
      await postLegs(tripId)
      onClose()
      router.push(`/trips/${tripId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateAndAdd() {
    if (!newTitle.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const trip = await apiFetch<TripSummary>('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), status: 'planned' }),
      })
      await postLegs(trip.id)
      onClose()
      router.push(`/trips/${trip.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open && !submitting) {
      setCreating(false)
      setNewTitle('')
      setError(null)
      onClose()
    }
  }

  return (
    <Sheet open={!!journey} onOpenChange={handleOpenChange}>
      <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Zu Reise hinzufügen</SheetTitle>
          <SheetDescription className="text-zinc-400">
            Vorhandene Reise wählen oder direkt eine neue anlegen.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {summary && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-zinc-700 text-zinc-200">
                  <Train className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{summary.title}</p>
                  <p className="text-xs text-zinc-400 mt-1">{summary.meta}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Neue Reise</p>
              {!creating && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
                  onClick={() => setCreating(true)}
                  disabled={submitting}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Neu
                </Button>
              )}
            </div>

            {creating ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="z. B. Interrail Sommer 2026"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm h-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                    disabled={submitting}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 bg-zinc-700 text-zinc-100 hover:bg-zinc-600 shrink-0"
                    onClick={handleCreateAndAdd}
                    disabled={submitting || !newTitle.trim()}
                  >
                    {submitting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Check className="h-4 w-4" />
                    }
                  </Button>
                </div>
                <button
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  onClick={() => { setCreating(false); setNewTitle('') }}
                  disabled={submitting}
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Reise direkt anlegen und diese Verbindung sofort speichern.
              </p>
            )}
          </div>

          {/* Existing trips */}
          {tripsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : !trips || trips.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-6">
              Noch keine Reisen vorhanden. Lege oben deine erste an.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Vorhandene Reisen</p>
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  disabled={submitting}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 hover:border-zinc-700 p-3 text-left transition-colors disabled:opacity-50"
                  onClick={() => handleSelectTrip(trip.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{trip.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {trip._count.legs} Abschnitt{trip._count.legs !== 1 ? 'e' : ''}
                        {trip.startDate && (
                          <span className="text-zinc-600">
                            {' · '}
                            {new Date(trip.startDate).toLocaleDateString('de-DE', {
                              day: 'numeric', month: 'short',
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                    {submitting
                      ? <Loader2 className="h-4 w-4 text-zinc-500 animate-spin shrink-0" />
                      : <ArrowRight className="h-4 w-4 text-zinc-600 shrink-0" />
                    }
                  </div>
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2 mt-2">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
