'use client'

import { useRouter } from 'next/navigation'

interface CommunityTripCardProps {
  trip: {
    id: string
    title: string
    user: { username: string; avatarUrl: string | null }
    trip: {
      legs: {
        id: string
        originName: string
        destName: string
        originLat: number | null
        originLon: number | null
        destLat: number | null
        destLon: number | null
        lineName: string | null
        trainNumber: string | null
        operator: string | null
        distanceKm: number | null
        plannedDeparture: string
        plannedArrival: string
        polyline: unknown | null
      }[]
    }
    _count: { ratings: number; likes: number; comments: number }
    avgRating: number | null
  }
}

export function CommunityTripCard({ trip }: CommunityTripCardProps) {
  const router = useRouter()
  const legs = trip.trip.legs ?? []
  const firstLeg = legs[0]
  const lastLeg = legs[legs.length - 1]
  const totalKm = legs.reduce(
    (s, l) => s + (Number(l.distanceKm) || 0),
    0,
  )
  const durationMin =
    firstLeg && lastLeg
      ? Math.round(
          (new Date(lastLeg.plannedArrival).getTime() -
            new Date(firstLeg.plannedDeparture).getTime()) /
            60000,
        )
      : 0

  return (
    <div
      onClick={() => router.push(`/entdecken/${trip.id}`)}
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground))'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'hsl(var(--border))'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Map thumbnail */}
      <div
        style={{
          height: 160,
          background: 'hsl(var(--secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {legs.length > 0 && (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 280 160"
            style={{ position: 'absolute' }}
          >
            {(() => {
              const pts = legs
                .filter(
                  (l) =>
                    l.originLat != null &&
                    l.originLon != null &&
                    l.destLat != null &&
                    l.destLon != null,
                )
                .map((l) => ({
                  x1: ((l.originLon + 20) * 280) / 40,
                  y1: ((60 - l.originLat) * 160) / 20,
                  x2: ((l.destLon + 20) * 280) / 40,
                  y2: ((60 - l.destLat) * 160) / 20,
                }))
              return pts.map((p, i) => (
                <line
                  key={i}
                  x1={p.x1}
                  y1={p.y1}
                  x2={p.x2}
                  y2={p.y2}
                  stroke="#2dd4b0"
                  strokeWidth="2"
                  opacity="0.7"
                />
              ))
            })()}
          </svg>
        )}
        <span
          style={{
            fontSize: 24,
            zIndex: 1,
            opacity: 0.3,
          }}
        >
          🗺
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px' }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'hsl(var(--foreground))',
            margin: 0,
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {trip.title}
        </h3>

        {/* Creator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'hsl(var(--muted))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: 'hsl(var(--muted-foreground))',
              overflow: 'hidden',
            }}
          >
            {trip.user.avatarUrl ? (
              <img
                src={trip.user.avatarUrl}
                alt=""
                style={{ width: 20, height: 20, borderRadius: '50%' }}
              />
            ) : (
              trip.user.username[0]?.toUpperCase()
            )}
          </div>
          <span
            style={{
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            {trip.user.username}
          </span>
        </div>

        {/* Route */}
        <div
          style={{
            fontSize: 12,
            color: 'hsl(var(--muted-foreground))',
            marginBottom: 8,
          }}
        >
          {firstLeg?.originName} → {lastLeg?.destName}
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          <span>{Math.round(totalKm)} km</span>
          <span>
            {Math.floor(durationMin / 60)}h {durationMin % 60}m
          </span>
          <span>{legs.length} Abschnitte</span>
        </div>

        {/* Rating + Likes */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid hsl(var(--border))',
          }}
        >
          {trip.avgRating != null ? (
            <span style={{ fontSize: 12, color: '#EF9F27' }}>
              ★ {trip.avgRating.toFixed(1)}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
              Neu
            </span>
          )}
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            ♥ {trip._count.likes}
          </span>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
            💬 {trip._count.comments}
          </span>
        </div>
      </div>
    </div>
  )
}
