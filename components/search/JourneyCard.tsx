'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Star } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Journey, VendoTrip } from '@/lib/vendo'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function legColor(trainNumber: string): string {
  const n = trainNumber.replace(/\s+/g, '').toLowerCase()
  if (n.startsWith('ice') || n.startsWith('tgv') || n.startsWith('est')) return 'bg-blue-500'
  if (
    n.startsWith('ic') || n.startsWith('ec') ||
    n.startsWith('en') || n.startsWith('rj')
  ) return 'bg-violet-500'
  if (n.startsWith('re')) return 'bg-green-500'
  if (n.startsWith('rb')) return 'bg-emerald-600'
  if (n.startsWith('s')) return 'bg-amber-500'
  return 'bg-zinc-500'
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(depIso: string, arrIso: string): string {
  const ms = new Date(arrIso).getTime() - new Date(depIso).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function shortName(name: string): string {
  return name.split('(')[0].trim()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface JourneyCardProps {
  journey: Journey
  onAddToTrip: (journey: Journey) => void
}

export function JourneyCard({ journey, onAddToTrip }: JourneyCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { legs } = journey
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]
  const transfers = legs.length - 1

  const operators = Array.from(new Set(legs.map((l) => l.operator).filter(Boolean))) as string[]

  // Build lookup: tripId → index in legsWithTrip (so we can map to useQueries index)
  const legsWithTrip = legs.filter((l) => l.tripId)
  const tripIdToQueryIdx = new Map(legsWithTrip.map((l, i) => [l.tripId!, i]))

  const stopQueries = useQueries({
    queries: expanded
      ? legsWithTrip.map((l) => ({
          queryKey: ['trip', l.tripId],
          queryFn: async (): Promise<VendoTrip> => {
            const res = await fetch(`/api/search/trip?tripId=${encodeURIComponent(l.tripId!)}`)
            const json = await res.json()
            return json.data as VendoTrip
          },
          staleTime: 300_000,
        }))
      : [],
  })

  // Fetch review aggregates for each leg (only legs with IBNRs)
  const legsWithIbnr = legs.filter((l) => l.originIbnr && l.destinationIbnr)
  const reviewQueries = useQueries({
    queries: legsWithIbnr.map((l) => ({
      queryKey: ['reviews', l.originIbnr, l.destinationIbnr],
      queryFn: async () => {
        const res = await fetch(
          `/api/reviews?origin=${encodeURIComponent(l.originIbnr!)}&destination=${encodeURIComponent(l.destinationIbnr!)}`
        )
        return res.json()
      },
      staleTime: 300_000,
    })),
  })

  const getReviewScore = (leg: typeof legs[0]): { avg: number; count: number } | null => {
    if (!leg.originIbnr || !leg.destinationIbnr) return null
    const legIndex = legsWithIbnr.findIndex(
      (l) => l.originIbnr === leg.originIbnr && l.destinationIbnr === leg.destinationIbnr
    )
    if (legIndex === -1) return null
    const data = reviewQueries[legIndex]?.data?.data
    if (!data?.aggregate || data.count < 1) return null
    return { avg: data.aggregate.avgOverall, count: data.count }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="p-4">

        {/* Times + Add button */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl font-bold text-white tabular-nums shrink-0">
              {fmtTime(firstLeg.departure)}
            </span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 whitespace-nowrap">
                {fmtDuration(firstLeg.departure, lastLeg.arrival)}
              </span>
              <div className="w-12 h-px bg-zinc-700 my-0.5" />
              {transfers > 0 && (
                <span className="text-xs text-zinc-600 whitespace-nowrap">
                  {transfers} {transfers === 1 ? 'change' : 'changes'}
                </span>
              )}
            </div>
            <span className="text-2xl font-bold text-white tabular-nums shrink-0">
              {fmtTime(lastLeg.arrival)}
            </span>
          </div>
          <Button
            size="sm"
            className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600 gap-1.5 shrink-0"
            onClick={() => onAddToTrip(journey)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add to trip
          </Button>
        </div>

        {/* Route strip */}
        <div className="flex items-start mb-3">
          {legs.map((leg, i) => (
            <Fragment key={i}>
              {/* Station node (origin for first leg, transfer for subsequent) */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-2 border-2 ${
                    i === 0 || i === legs.length - 1
                      ? 'bg-zinc-200 border-zinc-500'
                      : 'bg-zinc-500 border-zinc-600'
                  }`}
                />
                <span className="text-[11px] text-zinc-500 mt-1 text-center max-w-[56px] leading-tight">
                  {shortName(leg.origin)}
                </span>
              </div>

              {/* Segment bar + train label */}
              <div className="flex-1 flex flex-col items-center pt-2 px-1.5 min-w-0">
                <span className="text-[11px] text-zinc-300 font-medium whitespace-nowrap mb-1 truncate max-w-full">
                  {leg.trainNumber}
                </span>
                <div className={`w-full h-1 rounded-full ${legColor(leg.trainNumber)}`} />
                {leg.platform && (
                  <span className="text-[10px] text-zinc-600 mt-0.5">Gl.&nbsp;{leg.platform}</span>
                )}
                {(() => {
                  const review = getReviewScore(leg)
                  if (!review) return null
                  return (
                    <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 mt-0.5">
                      <Star className="h-2.5 w-2.5 fill-yellow-400" />
                      {review.avg.toFixed(1)} ({review.count})
                    </span>
                  )
                })()}
              </div>
            </Fragment>
          ))}

          {/* Final destination node */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 border-2 border-zinc-500 mt-2" />
            <span className="text-[11px] text-zinc-500 mt-1 text-center max-w-[56px] leading-tight">
              {shortName(lastLeg.destination)}
            </span>
          </div>
        </div>

        {/* Operator badges + expand toggle */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {operators.map((op) => (
              <Badge
                key={op}
                variant="outline"
                className="text-xs px-1.5 py-0 h-5 bg-zinc-800 border-zinc-700 text-zinc-400"
              >
                {op}
              </Badge>
            ))}
          </div>
          <button
            onClick={() => setExpanded((x) => !x)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            Stops
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />
            }
          </button>
        </div>
      </div>

      {/* Expanded intermediate stops */}
      {expanded && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
          {legs.map((leg, legIdx) => {
            const queryIdx = leg.tripId ? tripIdToQueryIdx.get(leg.tripId) : undefined
            const tripQuery = queryIdx !== undefined ? stopQueries[queryIdx] : undefined
            const stops = tripQuery?.data?.stops ?? []
            const isLoading = tripQuery?.isFetching ?? false

            return (
              <div key={legIdx} className="px-4 py-3">
                <p className="text-xs font-medium text-zinc-400 mb-2">
                  {leg.trainNumber}
                  <span className="text-zinc-600 font-normal">
                    {' '}· {shortName(leg.origin)} → {shortName(leg.destination)}
                  </span>
                </p>

                {isLoading ? (
                  <div className="space-y-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 bg-zinc-800" style={{ width: `${60 + i * 10}%` }} />
                    ))}
                  </div>
                ) : stops.length > 0 ? (
                  <ol className="space-y-1.5">
                    {stops.map((stop, si) => (
                      <li key={si} className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500 tabular-nums w-10 shrink-0 text-right">
                          {stop.plannedDep
                            ? fmtTime(stop.plannedDep)
                            : stop.plannedArr
                            ? fmtTime(stop.plannedArr)
                            : '–'}
                        </span>
                        <span
                          className={`truncate ${
                            si === 0 || si === stops.length - 1
                              ? 'text-zinc-200 font-medium'
                              : 'text-zinc-400'
                          }`}
                        >
                          {stop.name}
                        </span>
                        {stop.platform && (
                          <span className="text-zinc-600 shrink-0">Gl.&nbsp;{stop.platform}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-zinc-600">No stop data available.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
