'use client'

import dynamic from 'next/dynamic'

// Dynamically import TripMap with SSR disabled
const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  { ssr: false }
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface RouteLeg {
  originName:  string
  originLat:   number | null
  originLon:   number | null
  destName:    string
  destLat:     number | null
  destLon:     number | null
  /** GeoJSON polyline as [lon, lat][] pairs from DB */
  polyline?:   [number, number][] | null
  trainType?:  string | null
  trainNumber?: string | null
  operator?:   string | null
}

interface TripStats {
  distanceKm?:  number | null
  durationMs?:  number | null
}

interface TripRouteCardProps {
  legs:       RouteLeg[]
  stats?:     TripStats
  /** Name of first station, overrides legs[0].originName */
  originLabel?: string
  /** Name of last station, overrides last leg's destName */
  destLabel?:   string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TripRouteCard({ legs, stats, originLabel, destLabel }: TripRouteCardProps) {
  if (!legs.length) return null

  // Convert RouteLeg[] to Leg[] for TripMapPreview
  const tripLegs = legs.map((leg, index) => ({
    id: `preview-${index}`,
    tripId: 'preview',
    position: index,
    originName: leg.originName,
    originIbnr: null,
    originLat: leg.originLat,
    originLon: leg.originLon,
    plannedDeparture: new Date().toISOString(),
    actualDeparture: null,
    destName: leg.destName,
    destIbnr: null,
    destLat: leg.destLat,
    destLon: leg.destLon,
    plannedArrival: new Date().toISOString(),
    actualArrival: null,
    operator: (leg.operator ?? null) as string | null,
    lineName: null,
    trainType: leg.trainType ?? null,
    trainNumber: leg.trainNumber ?? null,
    platformPlanned: null,
    platformActual: null,
    arrivalPlatformPlanned: null,
    arrivalPlatformActual: null,
    status: 'planned',
    delayMinutes: 0,
    cancelled: false,
    distanceKm: null,
    tripIdVendo: null,
    polyline: leg.polyline ?? null,
    seat: null,
    notes: null,
    traewellingStatusId: null,
  }))

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalKm = stats?.distanceKm ?? legs.reduce((s, l) => s + (('distanceKm' in l ? (l as { distanceKm?: number | null }).distanceKm : null) ?? 0), 0)
  const durationStr = stats?.durationMs ? formatDuration(stats.durationMs) : null

  // Train labels for route bar badges
  const trainBadges = legs
    .filter(l => l.trainType || l.trainNumber)
    .slice(0, 3)
    .map(l => [l.trainType, l.trainNumber].filter(Boolean).join(' '))

  // Check if we have enough coordinates to show the map
  const hasCoords = tripLegs.some(leg => 
    (leg.originLat && leg.originLon) || (leg.destLat && leg.destLon) || (leg.polyline && leg.polyline.length > 0)
  )

  const first = legs[0]
  const last = legs[legs.length - 1]

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* ── Route bar ── */}
      <div className="px-6 py-3.5 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground/60 mb-0.5 tracking-[0.06em] font-semibold">VON</p>
            <p className="text-sm font-semibold text-foreground truncate">{originLabel ?? first.originName}</p>
          </div>
          <svg width="40" height="14" viewBox="0 0 40 14" fill="none" className="shrink-0">
            <line x1="0" y1="7" x2="30" y2="7" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
            <path d="M28 3L32 7L28 11" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="0" cy="7" r="2" fill="hsl(var(--primary))"/>
          </svg>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground/60 mb-0.5 tracking-[0.06em] font-semibold">NACH</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {destLabel ?? last.destName}
            </p>
          </div>
        </div>
        {trainBadges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap shrink-0">
            {trainBadges.map(b => (
              <span key={b} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-secondary text-primary border border-border whitespace-nowrap">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Map — flush, no padding ── */}
      {hasCoords ? (
        <div className="w-full h-[220px] md:h-[320px]">
          <TripMap legs={tripLegs} preview={false} className="h-full w-full" />
        </div>
      ) : (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Koordinaten werden geladen…</p>
        </div>
      )}

      {/* ── Stats bar ── */}
      <div className="px-6 py-3.5 border-t border-border flex gap-9">
        {totalKm > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground/60 mb-1 tracking-[0.06em] font-semibold">STRECKE</p>
            <p className="text-sm font-semibold text-foreground">{Math.round(totalKm).toLocaleString('de-DE')} km</p>
          </div>
        )}
        {durationStr && (
          <div>
            <p className="text-[10px] text-muted-foreground/60 mb-1 tracking-[0.06em] font-semibold">DAUER</p>
            <p className="text-sm font-semibold text-foreground">{durationStr}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-muted-foreground/60 mb-1 tracking-[0.06em] font-semibold">ABSCHNITTE</p>
          <p className="text-sm font-semibold text-foreground">{legs.length}</p>
        </div>
        {totalKm > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground/60 mb-1 tracking-[0.06em] font-semibold">CO₂ GESPART</p>
            <p className="text-sm font-semibold text-success">{Math.round(totalKm * 0.22).toLocaleString('de-DE')} kg</p>
          </div>
        )}
      </div>
    </div>
  )
}
