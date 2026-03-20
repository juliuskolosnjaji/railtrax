'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Train, BarChart2, ArrowRight, Plus, Calendar, MapPin } from 'lucide-react'
import { NewTripSheet } from '@/components/trips/NewTripSheet'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useEntitlements } from '@/hooks/useEntitlements'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardLeg {
  id: string
  originName: string
  destName: string
  plannedDeparture: string
  plannedArrival: string
  distanceKm?: number | null
  operator?: string | null
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

function formatTotalDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}

function formatDateRange(start?: string | null, end?: string | null): string {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  return ''
}

const STATUS_LABEL: Record<string, string> = {
  planned:   'Geplant',
  active:    'Aktiv',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
}

const STATUS_COLOR: Record<string, string> = {
  active:    'hsl(var(--primary))',
  planned:   'hsl(var(--muted-foreground))',
  completed: 'hsl(var(--success))',
  cancelled: 'hsl(var(--destructive))',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, success, isLoading,
}: {
  label: string
  value: string
  success?: boolean
  isLoading?: boolean
}) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <p className="stat-label mb-2">{label}</p>
      {isLoading ? (
        <div className="h-8 w-24 rounded-md animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />
      ) : (
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ color: success ? 'hsl(var(--success))' : 'hsl(var(--foreground))' }}
        >
          {value}
        </p>
      )}
    </div>
  )
}

function LinkCard({
  icon: Icon, title, href, children, isLoading,
}: {
  icon: React.ElementType
  title: string
  href: string
  children: React.ReactNode
  isLoading?: boolean
}) {
  const router = useRouter()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={e => e.key === 'Enter' && router.push(href)}
      className="glass-panel rounded-xl p-5 cursor-pointer transition-colors"
      style={{ minHeight: 'unset' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(var(--foreground) / 0.12)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-[14px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {title}
          </span>
        </div>
        <ArrowRight className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />
          <div className="h-3 w-48 rounded animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />
        </div>
      ) : children}
    </div>
  )
}

function TripRow({ trip }: { trip: TripWithLegs }) {
  const router = useRouter()
  const status = trip.status ?? 'planned'
  const km = Math.round(trip.legs.reduce((s, l) => s + (Number(l.distanceKm) || 0), 0))
  const from = trip.legs[0]?.originName
  const to = trip.legs[trip.legs.length - 1]?.destName
  const dateRange = formatDateRange(trip.startDate, trip.endDate)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/trips/${trip.id}`)}
      onKeyDown={e => e.key === 'Enter' && router.push(`/trips/${trip.id}`)}
      className="flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer"
      style={{ minHeight: 'unset', borderBottom: '1px solid hsl(var(--border))' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--secondary) / 0.5)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Status dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: STATUS_COLOR[status] ?? STATUS_COLOR.planned }}
      />

      {/* Title + route */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
            {trip.title}
          </span>
          <span className="text-[11px] shrink-0" style={{ color: STATUS_COLOR[status] ?? STATUS_COLOR.planned }}>
            {STATUS_LABEL[status] ?? 'Geplant'}
          </span>
        </div>
        {from && to && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
            <span className="text-[11px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {from} → {to}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="text-right shrink-0 space-y-0.5">
        {dateRange && (
          <div className="flex items-center gap-1 justify-end">
            <Calendar className="w-3 h-3" style={{ color: 'hsl(var(--muted-foreground))' }} />
            <span className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>{dateRange}</span>
          </div>
        )}
        {km > 0 && (
          <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {km.toLocaleString('de-DE')} km
          </p>
        )}
      </div>

      <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const { getLimit } = useEntitlements()

  const { data: trips, isLoading } = useQuery<TripWithLegs[]>({
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

  // ── Computed stats ──────────────────────────────────────────────────────────
  const totalKm = trips
    ? Math.round(trips.reduce((s, t) => s + t.legs.reduce((ls, l) => ls + (Number(l.distanceKm) || 0), 0), 0))
    : null
  const activeCount = trips ? trips.filter(t => t.status === 'active').length : null
  const co2Saved = totalKm !== null ? Math.round(totalKm * 0.172) : null

  const lastTrip = trips?.[0] ?? null
  const lastTripKm = lastTrip
    ? Math.round(lastTrip.legs.reduce((s, l) => s + (Number(l.distanceKm) || 0), 0))
    : 0
  const lastTripFrom = lastTrip?.legs[0]?.originName ?? null
  const lastTripTo   = lastTrip?.legs[(lastTrip.legs.length - 1)]?.destName ?? null

  const totalTrips = trips?.length ?? 0
  const totalDurationMs = trips
    ? trips.reduce((sum, t) =>
        sum + t.legs.reduce((ls, l) => {
          if (!l.plannedDeparture || !l.plannedArrival) return ls
          return ls + (new Date(l.plannedArrival).getTime() - new Date(l.plannedDeparture).getTime())
        }, 0), 0)
    : 0

  const maxTrips = getLimit('maxTrips')
  const atLimit = maxTrips !== Infinity && (trips?.length ?? 0) >= maxTrips

  function handleNewTrip() {
    if (atLimit) setUpgradeOpen(true)
    else setSheetOpen(true)
  }

  // Planned / active trips shown in the list
  const plannedTrips = trips?.filter(t => t.status !== 'completed' && t.status !== 'cancelled') ?? []

  return (
    <div style={{ padding: '28px 20px', maxWidth: 960 }}>
      <h1
        className="text-2xl font-bold tracking-tight mb-6"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        Übersicht
      </h1>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard
          label="GESAMTSTRECKE"
          value={totalKm !== null ? `${totalKm.toLocaleString('de-DE')} km` : '–'}
          isLoading={isLoading}
        />
        <StatCard
          label="AKTIVE REISEN"
          value={activeCount !== null ? String(activeCount) : '–'}
          isLoading={isLoading}
        />
        <StatCard
          label="CO₂ GESPART"
          value={co2Saved !== null ? `${co2Saved.toLocaleString('de-DE')} kg` : '–'}
          success
          isLoading={isLoading}
        />
      </div>

      {/* ── Link cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <LinkCard
          icon={Train}
          title="Letzte Reise"
          href={lastTrip ? `/trips/${lastTrip.id}` : '/search'}
          isLoading={isLoading}
        >
          {lastTrip ? (
            <>
              <p className="text-[14px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                {lastTrip.title}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {lastTripFrom && lastTripTo ? `${lastTripFrom} → ${lastTripTo}` : '–'}
                {lastTripKm > 0 && ` · ${lastTripKm.toLocaleString('de-DE')} km`}
              </p>
            </>
          ) : (
            <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Noch keine Reisen — jetzt suchen
            </p>
          )}
        </LinkCard>

        <LinkCard
          icon={BarChart2}
          title="Statistik"
          href="/stats"
          isLoading={isLoading}
        >
          <p className="text-[14px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>
            {totalTrips} Reisen
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {formatTotalDuration(totalDurationMs)} Gesamtdauer
          </p>
        </LinkCard>
      </div>

      {/* ── Planned trips list ── */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              Meine Reisen
            </span>
            {!isLoading && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' }}
              >
                {plannedTrips.length}
              </span>
            )}
          </div>
          <button
            onClick={handleNewTrip}
            className="tap-small flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: 'none', cursor: 'pointer',
              minHeight: 'unset', minWidth: 'unset',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Reise
          </button>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 rounded animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />
                  <div className="h-3 w-56 rounded animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />
                </div>
                <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'hsl(var(--secondary))' }} />
              </div>
            ))}
          </div>
        ) : plannedTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Keine Reisen geplant
            </p>
            <button
              onClick={handleNewTrip}
              className="tap-small text-[12px] font-medium px-4 py-2 rounded-lg transition-colors"
              style={{
                background: 'hsl(var(--secondary))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
              }}
            >
              + Erste Reise erstellen
            </button>
          </div>
        ) : (
          plannedTrips.map(trip => <TripRow key={trip.id} trip={trip} />)
        )}
      </div>

      <NewTripSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <UpgradeModal feature="journal" open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  )
}
