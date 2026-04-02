'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { TrainLegsSection } from '@/components/community/TrainLegsSection'
import { PhotosSection } from '@/components/community/PhotosSection'
import { CommentsSection } from '@/components/community/CommentsSection'
import { NachfahrenModal } from '@/components/community/NachfahrenModal'

const TripMapCard = dynamic(
  () => import('@/components/map/TripMapCard').then((m) => m.TripMapCard),
  { ssr: false, loading: () => <div style={{ height: 340, background: 'hsl(var(--secondary))' }} /> },
)

function ShareButton() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      style={{
        height: 40,
        padding: '0 16px',
        background: copied ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--secondary))',
        border: `1px solid ${copied ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
        borderRadius: 9,
        fontSize: 13,
        color: copied ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        cursor: 'pointer',
      }}
    >
      {copied ? '✓ Kopiert' : 'Teilen'}
    </button>
  )
}

export default function CommunityTripDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const [nachfahrenOpen, setNachfahrenOpen] = useState(false)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const { data: trip, isLoading } = useQuery({
    queryKey: ['community-trip', id],
    queryFn: () =>
      fetch(`/api/community/trips/${id}`)
        .then((r) => r.json())
        .then((d) => d.data),
  })

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await fetch(`/api/community/trips/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onMutate: async (rating) => {
      await qc.cancelQueries({ queryKey: ['community-trip', id] })
      qc.setQueryData(['community-trip', id], (old: any) => {
        if (!old) return old
        return { ...old, userRating: rating }
      })
    },
  })

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/community/trips/${id}/like`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      return res.json()
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['community-trip', id] })
      qc.setQueryData(['community-trip', id], (old: any) => {
        if (!old) return old
        const wasLiked = old.userLiked ?? false
        return {
          ...old,
          userLiked: !wasLiked,
          _count: {
            ...old._count,
            likes: wasLiked
              ? Math.max(0, (old._count?.likes ?? 0) - 1)
              : (old._count?.likes ?? 0) + 1,
          },
        }
      })
    },
  })

  if (isLoading)
    return (
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '24px 20px',
        }}
      >
        <div
          style={{
            height: 400,
            borderRadius: 14,
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        />
      </div>
    )

  if (!trip)
    return (
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '24px 20px',
          textAlign: 'center',
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        <p style={{ fontSize: 16 }}>Reise nicht gefunden</p>
      </div>
    )

  const legs = trip.trip?.legs ?? []
  const sortedLegs = [...legs].sort(
    (a: any, b: any) =>
      new Date(a.plannedDeparture).getTime() -
      new Date(b.plannedDeparture).getTime(),
  )
  const firstLeg = sortedLegs[0]
  const lastLeg = sortedLegs[sortedLegs.length - 1]
  const totalKm = sortedLegs.reduce(
    (s: number, l: any) => s + (Number(l.distanceKm) || 0),
    0,
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      {/* Back link */}
      <a
        href="/entdecken"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 13,
          color: 'hsl(var(--muted-foreground))',
          textDecoration: 'none',
          marginBottom: 16,
        }}
      >
        ← Entdecken
      </a>

      {/* Route card with map */}
      <div
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        {/* Header */}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: 'hsl(var(--muted-foreground))',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontWeight: 600,
                }}
              >
                Von
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'hsl(var(--foreground))',
                }}
              >
                {firstLeg?.originName}
              </div>
            </div>
            <span style={{ color: '#2dd4b0', fontSize: 18 }}>→</span>
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: 'hsl(var(--muted-foreground))',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontWeight: 600,
                }}
              >
                Nach
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'hsl(var(--foreground))',
                }}
              >
                {lastLeg?.destName}
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {sortedLegs.slice(0, 5).map((leg: any) => (
              <span
                key={leg.id}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 5,
                  background: 'hsl(var(--secondary))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--muted-foreground))',
                  fontFamily: 'monospace',
                }}
              >
                {leg.lineName ?? leg.trainNumber ?? '?'}
              </span>
            ))}
          </div>
        </div>

        {/* Map */}
        <TripMapCard
          legs={(sortedLegs as any[]).map((l) => ({
            ...l,
            originLon: l.originLon ?? null,
            originLat: l.originLat ?? null,
            destLon: l.destLon ?? null,
            destLat: l.destLat ?? null,
            polyline: l.polyline ?? null,
            originName: l.originName,
            destName: l.destName,
          }))}
          height={340}
        />

        {/* Stats footer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid hsl(var(--border))',
          }}
        >
          {[
            {
              label: 'Strecke',
              value: `${Math.round(totalKm)} km`,
              color: 'hsl(var(--foreground))',
            },
            {
              label: 'Abschnitte',
              value: String(sortedLegs.length),
              color: 'hsl(var(--foreground))',
            },
            {
              label: 'Bewertung',
              value: trip.avgRating
                ? `★ ${trip.avgRating.toFixed(1)}`
                : 'Neu',
              color: '#EF9F27',
            },
            {
              label: 'CO₂ Gespart',
              value: `${Math.round(totalKm * 0.22)} kg`,
              color: '#2dd4b0',
            },
          ].map(({ label, value, color }, i) => (
            <div
              key={label}
              style={{
                padding: '14px 16px',
                paddingLeft: i === 0 ? 20 : 16,
                borderLeft: i > 0 ? '1px solid hsl(var(--border))' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: 'hsl(var(--muted-foreground))',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color,
                  letterSpacing: '-0.5px',
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions + rating */}
      <div
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {/* Nachfahren CTA */}
        <button
          onClick={() => setNachfahrenOpen(true)}
          style={{
            height: 40,
            padding: '0 20px',
            background: '#1D9E75',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Diese Reise nachfahren
        </button>

        {/* Like button */}
        <button
          onClick={() => likeMutation.mutate()}
          style={{
            height: 40,
            padding: '0 16px',
            background: trip.userLiked
              ? 'hsl(var(--destructive) / 0.1)'
              : 'hsl(var(--secondary))',
            color: trip.userLiked
              ? 'hsl(var(--destructive))'
              : 'hsl(var(--muted-foreground))',
            border: `1px solid ${
              trip.userLiked
                ? 'hsl(var(--destructive))'
                : 'hsl(var(--border))'
            }`,
            borderRadius: 9,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {trip.userLiked ? '♥' : '♡'} {trip._count?.likes ?? 0}
        </button>

        {/* Share */}
        <ShareButton />

        {/* Star rating */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            Bewerten:
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setUserRating(n)
                  rateMutation.mutate(n)
                }}
                style={{
                  fontSize: 20,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color:
                    n <= (userRating ?? trip.userRating ?? 0)
                      ? '#EF9F27'
                      : 'hsl(var(--border))',
                  padding: 0,
                }}
              >
                ★
              </button>
            ))}
          </div>
          <span
            style={{
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            ({trip._count?.ratings ?? 0})
          </span>
        </div>
      </div>

      {/* Description */}
      {trip.description && (
        <div
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            padding: '16px 20px',
            fontSize: 14,
            color: 'hsl(var(--foreground))',
            lineHeight: 1.7,
            marginBottom: 16,
          }}
        >
          {trip.description}
        </div>
      )}

      {/* Creator info */}
      <div
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'hsl(var(--muted))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: 'hsl(var(--muted-foreground))',
            overflow: 'hidden',
          }}
        >
          {trip.user.avatarUrl ? (
            <img
              src={trip.user.avatarUrl}
              alt=""
              style={{ width: 36, height: 36, borderRadius: '50%' }}
            />
          ) : (
            trip.user.username[0]?.toUpperCase()
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'hsl(var(--foreground))',
            }}
          >
            {trip.user.username}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            Veröffentlicht am{' '}
            {new Date(trip.createdAt).toLocaleDateString('de-DE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Train legs */}
      <TrainLegsSection legs={sortedLegs} />

      {/* Photos */}
      <PhotosSection
        communityTripId={id as string}
        photos={trip.photos ?? []}
      />

      {/* Comments */}
      <CommentsSection
        communityTripId={id as string}
        comments={trip.comments ?? []}
      />

      {/* Nachfahren modal */}
      {nachfahrenOpen && (
        <NachfahrenModal
          communityTrip={trip}
          onClose={() => setNachfahrenOpen(false)}
        />
      )}
    </div>
  )
}
