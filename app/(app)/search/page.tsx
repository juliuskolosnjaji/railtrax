'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, ArrowRight, Search, Clock, Train, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StationInput } from '@/components/search/StationInput'
import { JourneyCard } from '@/components/search/JourneyCard'
import { AddToTripSheet } from '@/components/search/AddToTripSheet'
import type { Station, Journey } from '@/lib/vendo'

// ─── Recent searches ──────────────────────────────────────────────────────────

type RecentSearch = {
  origin: { id: string; name: string }
  destination: { id: string; name: string }
}

const RECENT_KEY = 'railtrax:recent-searches'
const MAX_RECENT = 5

function loadRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentSearch[]
  } catch { return [] }
}

function saveRecent(r: RecentSearch): RecentSearch[] {
  const key = `${r.origin.id}:${r.destination.id}`
  const filtered = loadRecent().filter((x: RecentSearch) => `${x.origin.id}:${x.destination.id}` !== key)
  const updated = [r, ...filtered].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  return updated
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function todayDate() { return new Date().toISOString().slice(0, 10) }
function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Search params type ───────────────────────────────────────────────────────

interface SearchParams {
  from: string
  to: string
  datetime: string
  travelClass: 1 | 2
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [origin, setOrigin] = useState<Station | null>(null)
  const [destination, setDestination] = useState<Station | null>(null)
  const [date, setDate] = useState(todayDate)
  const [time, setTime] = useState(nowTime)
  const [travelClass, setTravelClass] = useState<1 | 2>(2)
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])

  useEffect(() => {
    setRecentSearches(loadRecent())
  }, [])

  const {
    data: journeys,
    isFetching,
    error,
    isSuccess,
  } = useQuery<Journey[]>({
    queryKey: ['journeys', searchParams],
    queryFn: async () => {
      if (!searchParams) return []
      const params = new URLSearchParams({
        from: searchParams.from,
        to: searchParams.to,
        datetime: searchParams.datetime,
        class: String(searchParams.travelClass),
      })
      const res = await fetch(`/api/search/connections?${params}`)
      const json = await res.json()
      if (!res.ok) {
        const err = Object.assign(new Error(json.error ?? 'Search failed'), {
          status: res.status,
          retryAfter: json.retryAfter,
        })
        throw err
      }
      return json.data as Journey[]
    },
    enabled: !!searchParams,
    staleTime: 300_000,
    retry: false,
  })

  function handleSearch() {
    if (!origin || !destination) return
    const datetime = `${date}T${time}:00`
    setSearchParams({ from: origin.id, to: destination.id, datetime, travelClass })
    const updated = saveRecent({
      origin: { id: origin.id, name: origin.name },
      destination: { id: destination.id, name: destination.name },
    })
    setRecentSearches(updated)
  }

  function handleSwap() {
    setOrigin(destination)
    setDestination(origin)
  }

  function applyRecent(r: RecentSearch) {
    setOrigin({ id: r.origin.id, name: r.origin.name, lat: null, lon: null })
    setDestination({ id: r.destination.id, name: r.destination.name, lat: null, lon: null })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const is503 = (error as any)?.status === 503

  const showResults = !!searchParams

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Connection search</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Find train connections and add them to your trips.</p>
      </div>

      {/* ── Search form ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
        {/* Origin ↔ Destination */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 min-w-0">
            <StationInput
              id="origin"
              label="From"
              placeholder="Berlin Hbf"
              value={origin}
              onChange={setOrigin}
            />
          </div>
          <button
            type="button"
            onClick={handleSwap}
            className="shrink-0 p-2.5 mb-0.5 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Swap stations"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <StationInput
              id="destination"
              label="To"
              placeholder="Frankfurt Hbf"
              value={destination}
              onChange={setDestination}
            />
          </div>
        </div>

        {/* Date / time / class / search */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <label htmlFor="date" className="block text-xs font-medium text-zinc-400">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 w-36"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="time" className="block text-xs font-medium text-zinc-400">Time</label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 w-28"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400">Class</label>
            <div className="flex rounded-md border border-zinc-700 overflow-hidden h-[42px]">
              {([2, 1] as const).map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setTravelClass(cls)}
                  className={`px-3.5 text-sm font-medium transition-colors ${
                    travelClass === cls
                      ? 'bg-white text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {cls === 1 ? '1st' : '2nd'}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={!origin || !destination || isFetching}
            className="bg-white text-zinc-900 hover:bg-zinc-100 gap-2 ml-auto h-[42px]"
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Recent searches ───────────────────────────────────────────────── */}
      {!showResults && recentSearches.length > 0 && (
        <div className="mt-5">
          <p className="text-xs text-zinc-600 mb-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Recent
          </p>
          <div className="flex gap-2 flex-wrap">
            {recentSearches.map((r, i) => (
              <button
                key={i}
                onClick={() => applyRecent(r)}
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
              >
                <span>{r.origin.name.split('(')[0].trim()}</span>
                <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />
                <span>{r.destination.name.split('(')[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {showResults && (
        <div className="mt-6 space-y-3">
          {isFetching ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl bg-zinc-800" />
            ))
          ) : is503 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <p className="text-zinc-400 text-sm">
                Service temporarily unavailable — try again in a moment.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <p className="text-zinc-400 text-sm">Search failed — please try again.</p>
            </div>
          ) : isSuccess && journeys.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <Train className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">
                No connections found — try adjusting the time.
              </p>
            </div>
          ) : isSuccess ? (
            journeys.map((journey, i) => (
              <JourneyCard
                key={i}
                journey={journey}
                onAddToTrip={setSelectedJourney}
              />
            ))
          ) : null}
        </div>
      )}

      <AddToTripSheet
        journey={selectedJourney}
        onClose={() => setSelectedJourney(null)}
      />
    </div>
  )
}
