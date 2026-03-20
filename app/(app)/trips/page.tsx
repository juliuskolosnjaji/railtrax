'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Plus, ArrowRight } from 'lucide-react'
import { NewTripSheet } from '@/components/trips/NewTripSheet'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardLeg {
  originName: string
  destName: string
  plannedDeparture: string
  plannedArrival: string
  distanceKm?: number | null
  lineName?: string | null
  trainNumber?: string | null
  trainType?: string | null
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
  if (s && e) return `${s} — ${e}`
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

function getTrainChips(legs: DashboardLeg[]): string[] {
  const chips: string[] = []
  for (const leg of legs) {
    const label = leg.lineName || (leg.trainType && leg.trainNumber ? `${leg.trainType} ${leg.trainNumber}` : null)
    if (label && !chips.includes(label)) chips.push(label)
  }
  return chips.slice(0, 6)
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

  const counts = {
    all:       trips.length,
    planned:   trips.filter(t => t.status === 'planned').length,
    active:    trips.filter(t => t.status === 'active').length,
    completed: trips.filter(t => t.status === 'completed').length,
  }

  const filtered = filter === 'all' ? trips : trips.filter(t => t.status === filter)

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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-700 text-zinc-100 text-sm font-medium hover:bg-zinc-600 transition-colors shrink-0"
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
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-[#2e3d5a]',
            ].join(' ')}
            style={{ cursor: 'pointer' }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs ${filter === tab.key ? 'text-zinc-400' : 'text-muted-foreground/50'}`}>
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
            <div key={i} className="rounded-xl border border-border bg-card animate-pulse overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-28 rounded-full bg-muted" />
                  <div className="h-4 w-36 rounded bg-muted" />
                </div>
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="h-3 w-8 rounded bg-muted" />
                    <div className="h-6 w-28 rounded bg-muted" />
                  </div>
                  <div className="w-6 h-6 rounded bg-muted" />
                  <div className="space-y-1 text-right">
                    <div className="h-3 w-10 rounded bg-muted ml-auto" />
                    <div className="h-6 w-24 rounded bg-muted" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 rounded bg-muted" />
                  <div className="h-6 w-16 rounded bg-muted" />
                </div>
              </div>
              <div className="border-t border-border px-5 py-3 flex gap-6">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="space-y-1">
                    <div className="h-2.5 w-12 rounded bg-muted" />
                    <div className="h-4 w-16 rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm mb-3">Keine Reisen gefunden.</p>
          <button
            onClick={() => setSheetOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-[#2e3d5a] transition-colors"
            style={{ background: 'transparent', cursor: 'pointer' }}
          >
            + Erste Reise erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(trip => {
            const stats = getTripStats(trip)
            const chips = getTrainChips(trip.legs)
            const badge = STATUS_BADGE[trip.status ?? 'planned'] ?? STATUS_BADGE.planned
            const dateRange = formatDateRange(trip.startDate, trip.endDate)
            const originName = trip.legs[0]?.originName ?? null
            const destName = trip.legs.length > 0 ? trip.legs[trip.legs.length - 1].destName : null

            return (
              <div
                key={trip.id}
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="rounded-xl border border-border bg-card cursor-pointer hover:border-zinc-600 transition-all group overflow-hidden"
              >
                {/* Card body */}
                <div className="p-5">
                  {/* Top row: status badge + date range */}
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {dateRange && (
                      <span className="text-xs text-muted-foreground">{dateRange}</span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-[13px] font-semibold text-foreground mb-4">{trip.title}</p>

                  {/* VON / NACH */}
                  {(originName || destName) && (
                    <div className="flex items-end gap-3 mb-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5">Von</p>
                        <p className="text-[17px] font-bold text-foreground leading-tight truncate max-w-[160px]">
                          {originName ?? '–'}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground/40 shrink-0 mb-0.5" />
                      <div className="min-w-0 text-right flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5">Nach</p>
                        <p className="text-[17px] font-bold text-foreground leading-tight truncate">
                          {destName ?? '–'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Train chips */}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map(chip => (
                        <span
                          key={chip}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground border border-border"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats footer */}
                <div className="border-t border-border px-5 py-3 flex items-center gap-6 flex-wrap bg-secondary/20">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">Strecke</p>
                    <p className="text-sm font-semibold text-foreground">
                      {stats.distanceKm > 0 ? `${stats.distanceKm.toLocaleString('de-DE')} km` : '–'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">Dauer</p>
                    <p className="text-sm font-semibold text-foreground">
                      {stats.durationMs > 0 ? formatDuration(stats.durationMs) : '–'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">Abschnitte</p>
                    <p className="text-sm font-semibold text-foreground">{stats.legs}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">CO₂ gespart</p>
                    <p className="text-sm font-semibold text-success">
                      {stats.co2 > 0 ? `${stats.co2.toLocaleString('de-DE')} kg` : '–'}
                    </p>
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
