'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TrainLegsSectionProps {
  legs: {
    id: string
    originName: string
    destName: string
    lineName: string | null
    trainNumber: string | null
    operator: string | null
    plannedDeparture: string
    plannedArrival: string
    distanceKm: number | null
  }[]
}

export function TrainLegsSection({ legs }: TrainLegsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const showLegs = legs.slice(0, expanded ? undefined : 3)

  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'hsl(var(--foreground))',
            margin: 0,
          }}
        >
          Zugverbindungen ({legs.length})
        </h3>
        {legs.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {expanded ? 'Weniger' : 'Alle anzeigen'}{' '}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {showLegs.map((leg) => {
          const dep = new Date(leg.plannedDeparture)
          const arr = new Date(leg.plannedArrival)
          const dur = Math.round(
            (arr.getTime() - dep.getTime()) / 60000,
          )

          return (
            <div
              key={leg.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid hsl(var(--border))',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 5,
                  fontFamily: 'monospace',
                  background: '#111e35',
                  border: '1px solid #1e3a6e',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                {leg.lineName ?? leg.trainNumber ?? '?'}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'hsl(var(--foreground))',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {leg.originName} → {leg.destName}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'hsl(var(--muted-foreground))',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {dep.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                –{' '}
                {arr.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'hsl(var(--muted-foreground))',
                  flexShrink: 0,
                }}
              >
                {dur} Min.
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
