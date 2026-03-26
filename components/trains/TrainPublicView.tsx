'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { TrainRouteMap } from '@/components/map/TrainRouteMap'

interface Props {
  trainNumber: string
  date?: string
  tripId?: string
  fromStation?: string
}

export function TrainPublicView({ trainNumber, date, tripId }: Props) {

  const queryUrl = tripId
    ? `/api/trains/trip?tripId=${encodeURIComponent(tripId)}&lineName=${encodeURIComponent(trainNumber)}`
    : `/api/trains/trip?lineName=${encodeURIComponent(trainNumber)}&date=${date ?? new Date().toISOString().slice(0, 10)}`

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['train-public', tripId ?? trainNumber, date],
    queryFn: () => fetch(queryUrl).then(r => r.json()).then(d => d.data),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delayMin = (sec: any) => Math.round((sec ?? 0) / 60)

  if (isLoading) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
      Lade Zugdaten...
    </div>
  )

  if (isError || !data) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>
      Zugdaten nicht verfügbar.
    </div>
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalDelay = (data.stopovers as any[])
    ?.filter((s: any) => !s.isPassed)
    .reduce((max: number, s: any) => Math.max(max, delayMin(s.departureDelay ?? 0)), 0) ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stopsWithCoords = (data.stopovers as any[])?.filter((s: any) => s.lat != null && s.lon != null) ?? []
  const hasMap = stopsWithCoords.length >= 2

  return (
    <div style={{ width: '100%' }}>

      {/* ── DESKTOP: two-column grid ── */}
      <div
        className="train-public-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          gridTemplateRows: 'auto',
          gap: 16,
          alignItems: 'start',
        }}
      >

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {/* Train header card */}
          <div style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 14,
            padding: '20px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: 12,
              marginBottom: data.stopovers?.length > 1 ? 16 : 0,
            }}>
              <div>
                <div style={{
                  fontSize: 28, fontWeight: 800,
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '-0.5px',
                  fontFamily: '"JetBrains Mono", monospace',
                  marginBottom: 4,
                }}>
                  {data.lineName ?? trainNumber.toUpperCase()}
                </div>
                <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
                  Richtung {data.direction ?? data.destination}
                </div>
                {data.operator && (
                  <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                    {data.operator}
                  </div>
                )}
              </div>

              {/* Status badge + last updated */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {data.cancelled ? (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    padding: '5px 12px', borderRadius: 20,
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    Ausfall
                  </span>
                ) : totalDelay > 0 ? (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    padding: '5px 12px', borderRadius: 20,
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.15)',
                  }}>
                    +{totalDelay} Min
                  </span>
                ) : (
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    padding: '5px 12px', borderRadius: 20,
                    background: 'rgba(45,212,176,0.08)', color: 'hsl(var(--primary))',
                    border: '1px solid rgba(45,212,176,0.15)',
                  }}>
                    Pünktlich
                  </span>
                )}
                <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>
                  {new Date(dataUpdatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                  <button
                    onClick={() => refetch()}
                    style={{
                      background: 'none', border: 'none',
                      color: 'hsl(var(--primary))',
                      cursor: 'pointer', marginLeft: 6,
                      padding: 0, fontSize: 12,
                    }}
                  >
                    ↻
                  </button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {(data.stopovers?.length ?? 0) > 1 && (
              <div>
                <div style={{ height: 4, background: 'hsl(var(--secondary))', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.round((data.currentIdx / (data.stopovers.length - 1)) * 100)}%`,
                    background: 'hsl(var(--primary))', borderRadius: 2,
                  }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: 5, fontSize: 10, color: 'hsl(var(--muted-foreground))',
                }}>
                  <span>{data.origin}</span>
                  <span style={{ color: 'hsl(var(--primary))' }}>● {data.stopovers[data.currentIdx]?.name}</span>
                  <span>{data.destination}</span>
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          {(data.remarks?.length ?? 0) > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.remarks.map((r: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1.5 }}>{r.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stop list */}
          <div style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '56px 1fr 70px',
              padding: '8px 16px', borderBottom: '1px solid hsl(var(--border))', gap: 8,
            }}>
              {['ZEIT', 'HALT', 'GLEIS'].map(h => (
                <span key={h} style={{
                  fontSize: 9, fontWeight: 600,
                  color: 'hsl(var(--muted-foreground))',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(data.stopovers as any[])?.map((stop: any, i: number) => {
              const isCurrent   = i === data.currentIdx
              const isPassed    = stop.isPassed
              const isLast      = i === data.stopovers.length - 1
              const delay       = delayMin(stop.departureDelay ?? stop.arrivalDelay ?? 0)
              const platChanged = stop.platformActual && stop.platform &&
                stop.platformActual !== stop.platform
              const showTime    = stop.plannedDeparture ?? stop.plannedArrival

              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '56px 1fr 70px',
                  padding: '11px 16px', gap: 8,
                  borderBottom: isLast ? 'none' : '1px solid hsl(var(--border) / 0.5)',
                  background: isCurrent ? 'rgba(45,212,176,0.04)' : 'transparent',
                  alignItems: 'center',
                }}>
                  {/* Time */}
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: stop.cancelled ? '#ef4444'
                        : isPassed ? 'hsl(var(--muted-foreground))'
                        : 'hsl(var(--foreground))',
                      textDecoration: stop.cancelled ? 'line-through' : 'none',
                    }}>
                      {fmtTime(showTime)}
                    </div>
                    {delay > 0 && !stop.cancelled && (
                      <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>+{delay}</div>
                    )}
                  </div>

                  {/* Station name */}
                  <div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 600 : 400,
                      color: isPassed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                    }}>
                      {stop.name}
                    </div>
                    {isCurrent && (
                      <div style={{
                        fontSize: 9, color: 'hsl(var(--primary))',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        fontWeight: 600, marginTop: 2,
                      }}>
                        ● hier
                      </div>
                    )}
                  </div>

                  {/* Platform */}
                  <div style={{
                    fontSize: 12,
                    color: platChanged ? '#f59e0b' : 'hsl(var(--muted-foreground))',
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {(stop.platformActual ?? stop.platform)
                      ? `Gl. ${stop.platformActual ?? stop.platform}`
                      : '–'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'hsl(var(--muted-foreground))',
            padding: '8px 0',
          }}>
            Powered by{' '}
            <a href="/" style={{
              color: 'hsl(var(--primary))',
              textDecoration: 'none', fontWeight: 500,
            }}>
              Railtrax
            </a>
            {' — '}Plane deine eigenen Zugreisen
          </div>
        </div>

        {/* ── RIGHT COLUMN: Map ── */}
        {hasMap && (
          <div
            className="train-map-sticky"
            style={{
              position: 'sticky',
              top: 16,
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <TrainRouteMap
              stopovers={data.stopovers}
              currentIdx={data.currentIdx}
              height={600}
            />
          </div>
        )}
      </div>
    </div>
  )
}
