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
    <div className="bg-[#0a1628] border border-[#1e2d4a] rounded-xl overflow-hidden">

      {/* ── Route bar ── */}
      <div className="px-6 py-3.5 border-b border-[#1e2d4a] flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div>
            <p className="text-[10px] text-[#4a6a9a] mb-0.5 tracking-[0.06em] font-semibold">VON</p>
            <p className="text-sm font-semibold text-white">{originLabel ?? first.originName}</p>
          </div>
          <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
            <line x1="0" y1="7" x2="30" y2="7" stroke="#4f8ef7" strokeWidth="1.5"/>
            <path d="M28 3L32 7L28 11" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="0" cy="7" r="2" fill="#4f8ef7"/>
          </svg>
          <div>
            <p className="text-[10px] text-[#4a6a9a] mb-0.5 tracking-[0.06em] font-semibold">NACH</p>
            <p className="text-sm font-semibold text-white">
              {destLabel ?? last.destName}
            </p>
          </div>
        </div>
        {trainBadges.length > 0 && (
          <div className="flex gap-2">
            {trainBadges.map(b => (
              <span key={b} className="bg-[#0d1f3c] border border-[#1e3a6e] text-[#4f8ef7] px-2.5 py-1 rounded-md text-xs font-semibold">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Maplibre map ── */}
      <div className="p-6 relative overflow-hidden min-h-[280px] md:min-h-[400px]">
        {hasCoords ? (
          <div className="h-[280px] md:h-[400px] w-full">
            <TripMap legs={tripLegs} preview={false} className="h-full w-full" />
          </div>
        ) : (
          // No coords — show placeholder message
          <div className="h-[220px] flex items-center justify-center">
            <p className="text-[#4a6a9a] text-sm">Koordinaten werden geladen…</p>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="px-6 py-3.5 border-t border-[#1e2d4a] flex gap-9">
        {totalKm > 0 && (
          <div>
            <p className="text-[10px] text-[#4a6a9a] mb-1 tracking-[0.06em] font-semibold">STRECKE</p>
            <p className="text-sm font-semibold text-white">{Math.round(totalKm).toLocaleString('de-DE')} km</p>
          </div>
        )}
        {durationStr && (
          <div>
            <p className="text-[10px] text-[#4a6a9a] mb-1 tracking-[0.06em] font-semibold">DAUER</p>
            <p className="text-sm font-semibold text-white">{durationStr}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-[#4a6a9a] mb-1 tracking-[0.06em] font-semibold">ABSCHNITTE</p>
          <p className="text-sm font-semibold text-white">{legs.length}</p>
        </div>
        {totalKm > 0 && (
          <div>
            <p className="text-[10px] text-[#4a6a9a] mb-1 tracking-[0.06em] font-semibold">CO₂ GESPART</p>
            <p className="text-sm font-semibold text-[#3ecf6e]">{Math.round(totalKm * 0.22).toLocaleString('de-DE')} kg</p>
          </div>
        )}
      </div>
    </div>
  )
}
