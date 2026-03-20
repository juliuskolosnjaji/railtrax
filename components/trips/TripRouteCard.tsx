'use client'

import dynamic from 'next/dynamic'
import type { Leg } from '@/hooks/useTrips'

const TripMapCard = dynamic(
  () => import('@/components/map/TripMapCard').then((m) => m.TripMapCard),
  {
    ssr: false,
    loading: () => <div style={{ height: 280, background: '#0d1117' }} />,
  },
)

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function TripRouteCard({ legs }: { legs: Leg[] }) {
  if (!legs.length) return null

  const sortedLegs = [...legs].sort(
    (a, b) =>
      new Date(a.plannedDeparture).getTime() -
      new Date(b.plannedDeparture).getTime(),
  )

  const firstLeg = sortedLegs[0]
  const lastLeg = sortedLegs[sortedLegs.length - 1]

  const totalKm = sortedLegs.reduce((s, l) => s + (l.distanceKm ?? 0), 0)
  const totalMinutes = sortedLegs.reduce((s, l) => {
    if (!l.plannedDeparture || !l.plannedArrival) return s
    return (
      s +
      Math.round(
        (new Date(l.plannedArrival).getTime() -
          new Date(l.plannedDeparture).getTime()) /
          60000,
      )
    )
  }, 0)

  const stats = [
    {
      label: 'Strecke',
      value: totalKm > 0 ? `${Math.round(totalKm).toLocaleString('de-DE')} km` : '–',
      color: '#f0f4f8',
    },
    {
      label: 'Dauer',
      value: totalMinutes > 0 ? formatDuration(totalMinutes) : '–',
      color: '#f0f4f8',
    },
    {
      label: 'Abschnitte',
      value: String(sortedLegs.length),
      color: '#f0f4f8',
    },
    {
      label: 'CO₂ Gespart',
      value: totalKm > 0 ? `${Math.round(totalKm * 0.22)} kg` : '–',
      color: '#40e0b0',
    },
  ]

  return (
    <div
      style={{
        background: '#0f1117',
        border: '1px solid #1e2530',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Von → Nach */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontSize: 10,
                color: '#4a5568',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontWeight: 600,
              }}
            >
              Von
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8' }}>
              {firstLeg.originName}
            </span>
          </div>
          <span style={{ color: '#40e0b0', fontSize: 18 }}>→</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontSize: 10,
                color: '#4a5568',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontWeight: 600,
              }}
            >
              Nach
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8' }}>
              {lastLeg.destName}
            </span>
          </div>
        </div>

        {/* Train badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortedLegs
            .slice(0, 4)
            .map((leg) => {
              const label = leg.lineName ?? leg.trainNumber
              if (!label) return null
              return (
                <span
                  key={leg.id}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 5,
                    background: '#1a2030',
                    border: '1px solid #2a3545',
                    color: '#8ba3c7',
                    fontFamily: '"JetBrains Mono", "Courier New", monospace',
                    letterSpacing: '0.3px',
                  }}
                >
                  {label}
                </span>
              )
            })}
          {sortedLegs.length > 4 && (
            <span
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 5,
                background: '#1a2030',
                border: '1px solid #2a3545',
                color: '#4a5568',
              }}
            >
              +{sortedLegs.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <TripMapCard legs={sortedLegs} />

      {/* ── Footer stats ── */}
      <div
        className="trip-route-footer"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          padding: '16px 20px',
          borderTop: '1px solid #1e2530',
        }}
      >
        {stats.map(({ label, value, color }, i) => (
          <div
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              paddingLeft: i === 0 ? 0 : 16,
              paddingRight: 16,
              borderLeft: i === 0 ? 'none' : '1px solid #1e2530',
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: '#4a5568',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontWeight: 600,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color,
                letterSpacing: '-0.5px',
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
