'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { CommunityTripCard } from '@/components/community/CommunityTripCard'
import { PublishTripModal } from '@/components/community/PublishTripModal'

export default function EntdeckenPage() {
  const [sort, setSort] = useState<'popular' | 'new' | 'top'>('popular')
  const [publishOpen, setPublishOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['community-trips', sort],
    queryFn: () =>
      fetch(`/api/community/trips?sort=${sort}`)
        .then((r) => r.json())
        .then((d) => d.data ?? []),
    staleTime: 60_000,
  })

  return (
    <div
      style={{
        padding: '24px 20px',
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: 'hsl(var(--foreground))',
              marginBottom: 3,
            }}
          >
            Entdecken
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            Zugreisen der Community
          </p>
        </div>
        <button
          onClick={() => setPublishOpen(true)}
          style={{
            height: 40,
            padding: '0 16px',
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} />
          Reise teilen
        </button>
      </div>

      {/* Sort tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'hsl(var(--secondary))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 10,
          padding: 3,
          width: 'fit-content',
          marginBottom: 20,
        }}
      >
        {(['popular', 'new', 'top'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              border:
                sort === s ? '1px solid hsl(var(--border))' : 'none',
              background:
                sort === s ? 'hsl(var(--background))' : 'transparent',
              color:
                sort === s
                  ? 'hsl(var(--foreground))'
                  : 'hsl(var(--muted-foreground))',
              fontSize: 13,
              fontWeight: sort === s ? 500 : 400,
              cursor: 'pointer',
            }}
          >
            {s === 'popular'
              ? 'Beliebt'
              : s === 'new'
                ? 'Neu'
                : 'Top bewertet'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 320,
                  borderRadius: 12,
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
            ))
          : (data ?? []).map((trip: any) => (
              <CommunityTripCard key={trip.id} trip={trip} />
            ))}
      </div>

      {!isLoading && data?.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 8 }}>
            Noch keine Reisen veröffentlicht
          </p>
          <p style={{ fontSize: 14 }}>
            Sei der Erste und teile deine Reise!
          </p>
        </div>
      )}

      {publishOpen && (
        <PublishTripModal onClose={() => setPublishOpen(false)} />
      )}
    </div>
  )
}
