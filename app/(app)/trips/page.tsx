'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Plus, Calendar, ArrowRight, Train, Clock, MapPin, Leaf, Route } from 'lucide-react'
import { NewTripSheet } from '@/components/trips/NewTripSheet'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardLeg {
  originName: string
  destName: string
  plannedDeparture: string
  plannedArrival: string
  distanceKm?: number | null
}

interface TripWithLegs {
  id: string
  title: string
  status?: string | null
  startDate?: string | null
  endDate?: string | null
  legs: DashboardLeg[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateRange(start?: string | null, end?: string | null): string {
  const s = formatDate(start)
  const e = formatDate(end)
  if (s && e) return `${s} – ${e}`
  return s || e
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getTripStats(trip: TripWithLegs) {
  const distanceKm = Math.round(
    trip.legs.reduce((s, l) => s + (Number(l.distanceKm) || 0), 0)
  )
  const durationMs = trip.legs.reduce((s, l) => {
    if (!l.plannedDeparture || !l.plannedArrival) return s
    return s + (new Date(l.plannedArrival).getTime() - new Date(l.plannedDeparture).getTime())
  }, 0)
  const co2 = Math.round(distanceKm * 0.172)
  return { distanceKm, durationMs, co2, legs: trip.legs.length }
}

function getRouteStops(legs: DashboardLeg[]): string[] {
  if (legs.length === 0) return []
  const all = [legs[0].originName, ...legs.map(l => l.destName)]
  if (all.length <= 6) return all
  // Keep first, evenly-spaced middle (up to 4), and last
  const first = all[0]
  const last = all[all.length - 1]
  const middle = all.slice(1, -1)
  const step = Math.ceil(middle.length / 3)
  const picked: string[] = []
  for (let i = 0; i < middle.length && picked.length < 3; i += step) {
    picked.push(middle[i])
  }
  return [first, ...picked, last]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planned:   { label: 'Geplant',       cls: 'bg-[#1a2540] text-[#8ba3c7]' },
  active:    { label: 'Aktiv',         cls: 'bg-primary/20 text-primary' },
  completed: { label: 'Abgeschlossen', cls: 'bg-success/15 text-success' },
  cancelled: { label: 'Storniert',     cls: 'bg-destructive/15 text-destructive' },
}

type Filter = 'all' | 'planned' | 'active' | 'completed'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: trips = [], isLoading } = useQuery<TripWithLegs[]>({
    queryKey: ['trips', 'with-legs'],
    queryFn: async () => {
      const res = await fetch('/api/trips?legs=1')
      if (!res.ok) throw new Error('Failed to fetch trips')
      const json = await res.json() as { data: TripWithLegs[] }
      return json.data
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // Counts per status
  const counts = {
    all:       trips.length,
    planned:   trips.filter(t => t.status === 'planned').length,
    active:    trips.filter(t => t.status === 'active').length,
    completed: trips.filter(t => t.status === 'completed').length,
  }

  const filtered = filter === 'all' ? trips : trips.filter(t => t.status === filter)

  // Summary stats for subtitle
  const totalKm = Math.round(
    trips.reduce((s, t) => s + t.legs.reduce((ls, l) => ls + (Number(l.distanceKm) || 0), 0), 0)
  )
  const totalCo2 = Math.round(totalKm * 0.172)

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Meine Reisen</h1>
          {!isLoading && trips.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {trips.length} {trips.length === 1 ? 'Reise' : 'Reisen'}
              {totalKm > 0 && ` · ${totalKm.toLocaleString('de-DE')} km`}
              {totalCo2 > 0 && ` · ${totalCo2.toLocaleString('de-DE')} kg CO₂ gespart`}
            </p>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          <Plus className="w-4 h-4" />
          Neue Reise
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mt-4 mb-6 flex-wrap">
        {([
          { key: 'all',       label: 'Alle',          count: counts.all },
          { key: 'planned',   label: 'Geplant',       count: counts.planned },
          { key: 'active',    label: 'Aktiv',         count: counts.active },
          { key: 'completed', label: 'Abgeschlossen', count: counts.completed },
        ] as { key: Filter; label: string; count: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors border',
              filter === tab.key
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-transparent border-[#1e2d4a] text-muted-foreground hover:text-foreground hover:border-[#2e3d5a]',
            ].join(' ')}
            style={{ cursor: 'pointer' }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs ${filter === tab.key ? 'text-primary/70' : 'text-muted-foreground/50'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Trip cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-[#1e2d4a] bg-[#0a1628] p-5 animate-pulse">
              <div className="flex gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#0d1f3c] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 rounded bg-[#0d1f3c]" />
                  <div className="h-3 w-32 rounded bg-[#0d1f3c]" />
                </div>
              </div>
              <div className="h-8 rounded bg-[#0d1f3c] mb-4" />
              <div className="h-px bg-[#0d1f3c] mb-3" />
              <div className="flex gap-8">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-2.5 w-12 rounded bg-[#0d1f3c]" />
                    <div className="h-4 w-16 rounded bg-[#0d1f3c]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-[#1e2d4a]">
          <p className="text-muted-foreground text-sm mb-3">Keine Reisen gefunden.</p>
          <button
            onClick={() => setSheetOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[#1e2d4a] text-muted-foreground hover:text-foreground hover:border-[#2e3d5a] transition-colors"
            style={{ background: 'transparent', cursor: 'pointer' }}
          >
            + Erste Reise erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(trip => {
            const stats = getTripStats(trip)
            const stops = getRouteStops(trip.legs)
            const badge = STATUS_BADGE[trip.status ?? 'planned'] ?? STATUS_BADGE.planned
            const dateRange = formatDateRange(trip.startDate, trip.endDate)

            return (
              <div
                key={trip.id}
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="rounded-xl border border-[#1e2d4a] bg-[#0a1628] p-5 cursor-pointer hover:border-[#2a3d5e] hover:bg-[#0c1830] transition-all group"
              >
                {/* Top row: icon + title + arrow */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Train className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-semibold text-foreground">{trip.title}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    {dateRange && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">{dateRange}</span>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1 shrink-0" />
                </div>

                {/* Route dots */}
                {stops.length > 1 && (
                  <div className="mt-4 flex items-start overflow-x-auto">
                    {stops.map((stop, i) => (
                      <div key={i} className="flex items-center shrink-0">
                        <div className="flex flex-col items-center gap-1 w-14">
                          <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                            i === 0 || i === stops.length - 1
                              ? 'bg-primary border-primary'
                              : 'bg-transparent border-[#4a6a9a]'
                          }`} />
                          <span className="text-[10px] text-muted-foreground text-center w-14 truncate leading-tight px-0.5">
                            {stop}
                          </span>
                        </div>
                        {i < stops.length - 1 && (
                          <div className="h-px flex-1 bg-[#1e2d4a] min-w-6 mb-4" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="mt-3 pt-3 border-t border-[#1e2d4a] flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Route className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium leading-none mb-0.5">Strecke</p>
                      <p className="text-sm font-semibold text-foreground">
                        {stats.distanceKm > 0 ? `${stats.distanceKm.toLocaleString('de-DE')} km` : '–'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium leading-none mb-0.5">Dauer</p>
                      <p className="text-sm font-semibold text-foreground">
                        {stats.durationMs > 0 ? formatDuration(stats.durationMs) : '–'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium leading-none mb-0.5">Abschnitte</p>
                      <p className="text-sm font-semibold text-foreground">{stats.legs}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5 text-success/60 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium leading-none mb-0.5">CO₂</p>
                      <p className="text-sm font-semibold text-success">
                        {stats.co2 > 0 ? `${stats.co2.toLocaleString('de-DE')} kg` : '–'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewTripSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
