'use client'

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

// ─── Projection ──────────────────────────────────────────────────────────────

function projectCoords(
  coords: { lat: number; lon: number }[],
  svgWidth:  number,
  svgHeight: number,
  padding = 40,
): { x: number; y: number }[] {
  const lats = coords.map(c => c.lat)
  const lons = coords.map(c => c.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)

  // Pad the bounding box so stations aren't crammed to edges
  const latPad = (maxLat - minLat) * 0.25 || 1
  const lonPad = (maxLon - minLon) * 0.25 || 1
  const bMinLat = minLat - latPad
  const bMaxLat = maxLat + latPad
  const bMinLon = minLon - lonPad
  const bMaxLon = maxLon + lonPad

  // Mercator longitude correction at average latitude
  const avgLat = (bMinLat + bMaxLat) / 2
  const lonScale = Math.cos((avgLat * Math.PI) / 180)

  const usableW = svgWidth  - padding * 2
  const usableH = svgHeight - padding * 2

  return coords.map(({ lat, lon }) => ({
    x: padding + ((lon - bMinLon) / (bMaxLon - bMinLon)) * usableW,
    // Invert Y: higher lat = lower Y value in SVG
    y: padding + (1 - (lat - bMinLat) / (bMaxLat - bMinLat)) * usableH * lonScale
       + usableH * (1 - lonScale) / 2,
  }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

// ─── Component ───────────────────────────────────────────────────────────────

const SVG_W = 820
const SVG_H = 210

export function TripRouteCard({ legs, stats, originLabel, destLabel }: TripRouteCardProps) {
  if (!legs.length) return null

  // ── Collect ordered station coords ──────────────────────────────────────
  const stations: { lat: number; lon: number; name: string; isEndpoint: boolean }[] = []

  // Seed with origin of first leg
  const first = legs[0]
  if (first.originLat != null && first.originLon != null) {
    stations.push({
      lat: first.originLat,
      lon: first.originLon,
      name: originLabel ?? first.originName,
      isEndpoint: true,
    })
  }

  // Add each leg's destination
  legs.forEach((leg, i) => {
    if (leg.destLat != null && leg.destLon != null) {
      stations.push({
        lat: leg.destLat,
        lon: leg.destLon,
        name: i === legs.length - 1 ? (destLabel ?? leg.destName) : leg.destName,
        isEndpoint: i === legs.length - 1,
      })
    }
  })

  const hasCoords = stations.length >= 2

  // ── Project station coords to SVG space ─────────────────────────────────
  const projectedStations = hasCoords
    ? projectCoords(stations, SVG_W, SVG_H)
    : []

  // ── Build path data ──────────────────────────────────────────────────────
  // For each leg, prefer the stored polyline (real railway geometry) over a
  // straight station-to-station line.
  let mainPathD = ''
  let shadowPathD = ''

  if (hasCoords) {
    const allProjectedPoints: { x: number; y: number }[] = []

    legs.forEach((leg) => {
      if (leg.polyline && leg.polyline.length >= 2) {
        // Convert GeoJSON [lon, lat][] to { lat, lon }[]
        const polyCoords = leg.polyline.map(([lon, lat]) => ({ lat, lon }))
        const projected = projectCoords(polyCoords, SVG_W, SVG_H)
        allProjectedPoints.push(...projected)
      } else {
        // Fall back to straight line between origin and destination
        const oIdx = legs.indexOf(leg)
        const dIdx = oIdx + 1
        if (projectedStations[oIdx]) allProjectedPoints.push(projectedStations[oIdx])
        if (projectedStations[dIdx]) allProjectedPoints.push(projectedStations[dIdx])
      }
    })

    // De-duplicate consecutive duplicate points (polyline stitching)
    const deduped = allProjectedPoints.filter(
      (p, i, arr) => i === 0 || p.x !== arr[i - 1].x || p.y !== arr[i - 1].y,
    )

    mainPathD   = deduped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    // Shadow track slightly offset downward
    shadowPathD = deduped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${(p.y + 4).toFixed(1)}`).join(' ')
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalKm = stats?.distanceKm ?? legs.reduce((s, l) => s + (('distanceKm' in l ? (l as { distanceKm?: number | null }).distanceKm : null) ?? 0), 0)
  const durationStr = stats?.durationMs ? formatDuration(stats.durationMs) : null

  // Train labels for route bar badges
  const trainBadges = legs
    .filter(l => l.trainType || l.trainNumber)
    .slice(0, 3)
    .map(l => [l.trainType, l.trainNumber].filter(Boolean).join(' '))

  return (
    <div style={{ background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 16, overflow: 'hidden' }}>

      {/* ── Route bar ── */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 2, letterSpacing: '0.06em', fontWeight: 600 }}>VON</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{originLabel ?? first.originName}</p>
          </div>
          <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
            <line x1="0" y1="7" x2="30" y2="7" stroke="#4f8ef7" strokeWidth="1.5"/>
            <path d="M28 3L32 7L28 11" stroke="#4f8ef7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="0" cy="7" r="2" fill="#4f8ef7"/>
          </svg>
          <div>
            <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 2, letterSpacing: '0.06em', fontWeight: 600 }}>NACH</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              {destLabel ?? legs[legs.length - 1].destName}
            </p>
          </div>
        </div>
        {trainBadges.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {trainBadges.map(b => (
              <span key={b} style={{ background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#4f8ef7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── SVG route map ── */}
      <div style={{ padding: '24px', position: 'relative', overflow: 'hidden', minHeight: 240 }}>
        {/* Background dot grid */}
        <svg
          width="100%" height="220" viewBox="0 0 860 220" fill="none"
          style={{ position: 'absolute', inset: 0, opacity: 0.08 }}
          aria-hidden="true"
        >
          {Array.from({ length: 13 }).flatMap((_, i) =>
            Array.from({ length: 7 }).map((_, j) => (
              <circle key={`${i}-${j}`} cx={30 + i * 67} cy={20 + j * 32} r="1.5" fill="#4f8ef7" />
            ))
          )}
        </svg>

        {hasCoords ? (
          <svg width="100%" height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} fill="none" style={{ position: 'relative', zIndex: 1 }}>
            {/* Glow layer */}
            <path d={mainPathD} stroke="#4f8ef7" strokeWidth="6" strokeLinecap="round" opacity="0.15" fill="none"/>
            {/* Shadow track */}
            <path d={shadowPathD} stroke="#1e3a6e" strokeWidth="1" strokeDasharray="4 4" strokeLinecap="round" fill="none"/>
            {/* Main route line */}
            <path d={mainPathD} stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

            {/* Station dots */}
            {projectedStations.map((pt, i) => {
              const s = stations[i]
              const r      = s.isEndpoint ? 6   : 4.5
              const rInner = s.isEndpoint ? 3   : 2
              const sw     = s.isEndpoint ? 2   : 1.5
              const fs     = s.isEndpoint ? 11  : 10
              // Nudge label up if near bottom edge
              const labelY = pt.y + r + (pt.y > SVG_H - 30 ? -r - 4 : 14)
              return (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r={r}      fill="#080d1a" stroke="#4f8ef7" strokeWidth={sw}/>
                  <circle cx={pt.x} cy={pt.y} r={rInner} fill="#4f8ef7"/>
                  <text
                    x={pt.x} y={labelY}
                    textAnchor="middle"
                    fill="#8ba3c7"
                    fontSize={fs}
                    fontFamily="Inter, sans-serif"
                  >
                    {s.name.replace(/ Hauptbahnhof| Centraal| Hbf| hbf/, '')}
                  </text>
                </g>
              )
            })}
          </svg>
        ) : (
          // No coords — show placeholder message
          <div style={{ height: SVG_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#4a6a9a', fontSize: 13 }}>Koordinaten werden geladen…</p>
          </div>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid #1e2d4a', display: 'flex', gap: 36 }}>
        {totalKm > 0 && (
          <div>
            <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>STRECKE</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{Math.round(totalKm).toLocaleString('de-DE')} km</p>
          </div>
        )}
        {durationStr && (
          <div>
            <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>DAUER</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{durationStr}</p>
          </div>
        )}
        <div>
          <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>ABSCHNITTE</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{legs.length}</p>
        </div>
        {totalKm > 0 && (
          <div>
            <p style={{ fontSize: 10, color: '#4a6a9a', marginBottom: 3, letterSpacing: '0.06em', fontWeight: 600 }}>CO₂ GESPART</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#3ecf6e' }}>{Math.round(totalKm * 0.22).toLocaleString('de-DE')} kg</p>
          </div>
        )}
      </div>
    </div>
  )
}
