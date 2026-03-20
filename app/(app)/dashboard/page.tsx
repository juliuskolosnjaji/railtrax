'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Train, BarChart2, ArrowRight } from 'lucide-react'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTotalDuration(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: trips, isLoading } = useQuery<TripWithLegs[]>({
    queryKey: ['trips', 'with-legs'],
    queryFn: async () => {
      const res = await fetch('/api/trips?legs=1')
      if (!res.ok) throw new Error('Failed to fetch trips')
      const json = await res.json() as { data: TripWithLegs[] }
      return json.data
    },
    staleTime: 30_000,
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
  const lastTripTo   = lastTrip?.legs[lastTrip.legs.length - 1]?.destName ?? null

  const totalTrips = trips?.length ?? 0
  const totalDurationMs = trips
    ? trips.reduce((sum, t) =>
        sum + t.legs.reduce((ls, l) => {
          if (!l.plannedDeparture || !l.plannedArrival) return ls
          return ls + (new Date(l.plannedArrival).getTime() - new Date(l.plannedDeparture).getTime())
        }, 0), 0)
    : 0

  return (
    <div style={{ padding: '28px 20px', maxWidth: 960 }}>
      <h1
        className="text-2xl font-bold tracking-tight mb-6"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        Übersicht
      </h1>

      {/* ── Stats row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 16,
        }}
      >
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
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
                {lastTripFrom && lastTripTo
                  ? `${lastTripFrom} → ${lastTripTo}`
                  : '–'}
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
    </div>
  )
}
