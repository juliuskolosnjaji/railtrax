'use client'

import { useQuery } from '@tanstack/react-query'
import { X, AlertTriangle, Info } from 'lucide-react'
import { useEffect } from 'react'

interface Departure {
  tripId: string
  trainNumber: string
  direction: string
  plannedTime: string
  delay: number
  platform: string | null
  platformActual: string | null
  operator: string | null
}

interface Props {
  departure: Departure
  stationName: string
  onClose: () => void
}

export function TripDetailPanel({ departure, stationName, onClose }: Props) {

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trip-detail', departure.tripId],
    queryFn: () =>
      fetch(
        `/api/trains/trip?tripId=${encodeURIComponent(departure.tripId)}` +
        `&lineName=${encodeURIComponent(departure.trainNumber)}`
      ).then(r => r.json()).then(d => d.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null

  const delayMin = (sec: number) => Math.round(sec / 60)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        right: 0, top: 0, bottom: 0,
        width: 'min(420px, 100vw)',
        zIndex: 50,
        background: 'hsl(var(--card))',
        borderLeft: '1px solid hsl(var(--border))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInPanel 0.22s ease-out',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid hsl(var(--border))',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              {/* Train badge + operator + cancelled */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 5,
                  background: '#1a2030',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {departure.trainNumber}
                </span>
                {(data?.operator ?? departure.operator) && (
                  <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                    {data?.operator ?? departure.operator}
                  </span>
                )}
                {data?.cancelled && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    AUSFALL
                  </span>
                )}
              </div>

              {/* Direction */}
              <div style={{
                fontSize: 15, fontWeight: 600,
                color: 'hsl(var(--foreground))',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                Richtung {departure.direction}
              </div>

              {/* Departure info */}
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>
                Ab {stationName} · {fmtTime(departure.plannedTime)}
                {delayMin(departure.delay) > 0 && (
                  <span style={{ color: '#ef4444', marginLeft: 4 }}>
                    +{delayMin(departure.delay)} Min
                  </span>
                )}
                {(departure.platformActual ?? departure.platform) && (
                  <span style={{ marginLeft: 6 }}>
                    · Gl. {departure.platformActual ?? departure.platform}
                  </span>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'hsl(var(--secondary))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 7, cursor: 'pointer', flexShrink: 0,
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Journey progress bar */}
          {data && !data.cancelled && (data.stopovers?.length ?? 0) > 1 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                height: 3,
                background: 'hsl(var(--secondary))',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${Math.round((data.currentIdx / (data.stopovers.length - 1)) * 100)}%`,
                  background: 'hsl(var(--primary))',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 4, fontSize: 10, color: 'hsl(var(--muted-foreground))',
              }}>
                <span>{data.origin}</span>
                <span style={{ color: 'hsl(var(--primary))' }}>
                  ● {data.stopovers[data.currentIdx]?.name}
                </span>
                <span>{data.destination}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Remarks / warnings ── */}
        {(data?.remarks?.length ?? 0) > 0 && (
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid hsl(var(--border))',
            flexShrink: 0,
          }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.remarks.map((r: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '6px 0' }}>
                {r.type === 'warning'
                  ? <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <Info size={13} color="#4f8ef7" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <span style={{
                  fontSize: 12,
                  color: r.type === 'warning' ? '#f59e0b' : 'hsl(var(--muted-foreground))',
                  lineHeight: 1.4,
                }}>
                  {r.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Stop list ── */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '8px 0' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 20px', opacity: 1 - i * 0.07 }}>
                  <div style={{ width: 36, height: 14, background: 'hsl(var(--secondary))', borderRadius: 3 }} />
                  <div style={{ width: 140, height: 14, background: 'hsl(var(--secondary))', borderRadius: 3 }} />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
              Zugdaten konnten nicht geladen werden.
            </div>
          )}

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {data?.stopovers?.map((stop: any, i: number) => {
            const isCurrent   = i === data.currentIdx
            const isPassed    = stop.isPassed
            const isFirst     = i === 0
            const isLast      = i === data.stopovers.length - 1
            const depDelay    = delayMin(stop.departureDelay ?? 0)
            const arrDelay    = delayMin(stop.arrivalDelay ?? 0)
            const maxDelay    = Math.max(depDelay, arrDelay)
            const platChanged = stop.platformActual &&
              stop.platform &&
              stop.platformActual !== stop.platform
            const showTime   = stop.plannedDeparture ?? stop.plannedArrival

            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'stretch',
                padding: '0 20px',
                background: isCurrent ? 'rgba(45,212,176,0.04)' : 'transparent',
              }}>

                {/* Timeline column */}
                <div style={{
                  width: 20,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  flexShrink: 0, marginRight: 14,
                }}>
                  {!isFirst && (
                    <div style={{
                      width: 2, flex: '0 0 12px',
                      background: isPassed ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    }} />
                  )}
                  <div style={{
                    width:  (isCurrent || isFirst || isLast) ? 12 : 8,
                    height: (isCurrent || isFirst || isLast) ? 12 : 8,
                    borderRadius: '50%',
                    background: isCurrent || isPassed
                      ? 'hsl(var(--primary))'
                      : (isFirst || isLast)
                        ? 'hsl(var(--foreground))'
                        : 'hsl(var(--secondary))',
                    border: (isCurrent || isPassed)
                      ? '2px solid hsl(var(--primary))'
                      : '2px solid hsl(var(--border))',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(45,212,176,0.15)' : 'none',
                    flexShrink: 0,
                  }} />
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 12,
                      background: (isPassed && !isCurrent) ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    }} />
                  )}
                </div>

                {/* Stop content */}
                <div style={{
                  flex: 1, padding: '10px 0', minWidth: 0,
                  borderBottom: isLast ? 'none' : '1px solid hsl(var(--border) / 0.4)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>

                    {/* Left: time + name */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        {showTime && (
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color: stop.cancelled
                              ? '#ef4444'
                              : isPassed
                                ? 'hsl(var(--muted-foreground))'
                                : 'hsl(var(--foreground))',
                            textDecoration: stop.cancelled ? 'line-through' : 'none',
                          }}>
                            {fmtTime(showTime)}
                          </span>
                        )}

                        {!stop.cancelled && maxDelay > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            padding: '1px 5px', borderRadius: 3,
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          }}>
                            +{maxDelay}
                          </span>
                        )}

                        {stop.cancelled && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            padding: '1px 5px', borderRadius: 3,
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          }}>
                            Ausfall
                          </span>
                        )}

                        {!isPassed && !stop.cancelled && maxDelay === 0 && !isFirst && !isLast && (
                          <span style={{ fontSize: 10, color: 'hsl(var(--primary))', opacity: 0.7 }}>
                            pünktl.
                          </span>
                        )}
                      </div>

                      <div style={{
                        fontSize: 13,
                        fontWeight: (isCurrent || isFirst || isLast) ? 500 : 400,
                        color: isCurrent || !isPassed
                          ? 'hsl(var(--foreground))'
                          : 'hsl(var(--muted-foreground))',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {stop.name}
                      </div>

                      {isCurrent && (
                        <div style={{
                          fontSize: 9, color: 'hsl(var(--primary))',
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          marginTop: 2, fontWeight: 600,
                        }}>
                          ● Zug befindet sich hier
                        </div>
                      )}
                    </div>

                    {/* Right: platform */}
                    {stop.platform && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 12,
                          fontVariantNumeric: 'tabular-nums',
                          color: platChanged ? '#f59e0b' : 'hsl(var(--muted-foreground))',
                          fontWeight: platChanged ? 600 : 400,
                        }}>
                          Gl. {stop.platformActual ?? stop.platform}
                        </div>
                        {platChanged && (
                          <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through' }}>
                            {stop.platform}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideInPanel {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
