'use client'

import { useQuery } from '@tanstack/react-query'
import { X, AlertTriangle, Info, Share2, Check, Copy, Mail, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TrainRouteMap } from '@/components/map/TrainRouteMap'

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
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied]       = useState(false)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'https://railtrax.eu')
  const shareUrl = `${baseUrl}/zug/${encodeURIComponent(departure.trainNumber)}?tripId=${encodeURIComponent(departure.tripId)}&date=${new Date(departure.plannedTime).toISOString().slice(0, 10)}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
            <div style={{ minWidth: 0, flex: 1 }}>
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

            {/* Share + Close buttons */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>

              {/* Share button + popover */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShareOpen(v => !v)}
                  title="Zug teilen"
                  style={{
                    width: 30, height: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: shareOpen ? 'rgba(45,212,176,0.1)' : 'hsl(var(--secondary))',
                    border: `1px solid ${shareOpen ? 'rgba(45,212,176,0.3)' : 'hsl(var(--border))'}`,
                    borderRadius: 7, cursor: 'pointer',
                    color: shareOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    transition: 'all 0.15s',
                  }}
                >
                  <Share2 size={13} />
                </button>

                {shareOpen && (
                  <>
                    {/* Popover backdrop */}
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                      onClick={() => setShareOpen(false)}
                    />

                    {/* Popover */}
                    <div style={{
                      position: 'absolute',
                      top: '100%', right: 0,
                      marginTop: 6,
                      width: 280,
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      zIndex: 70,
                      overflow: 'hidden',
                      animation: 'fadeIn 0.15s ease-out',
                    }}>
                      {/* Header */}
                      <div style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid hsl(var(--border))',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                          {departure.trainNumber} teilen
                        </span>
                        <button
                          onClick={() => setShareOpen(false)}
                          style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: 0 }}
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* URL copy row */}
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid hsl(var(--border))' }}>
                        <div style={{
                          fontSize: 10, color: 'hsl(var(--muted-foreground))',
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          marginBottom: 8, fontWeight: 600,
                        }}>
                          Link kopieren
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{
                            flex: 1, padding: '7px 10px',
                            background: 'hsl(var(--secondary))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 7,
                            fontSize: 11,
                            color: 'hsl(var(--muted-foreground))',
                            fontFamily: '"JetBrains Mono", monospace',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {shareUrl.replace('https://', '')}
                          </div>
                          <button
                            onClick={handleCopy}
                            style={{
                              width: 32, height: 32,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: copied ? 'rgba(45,212,176,0.1)' : 'hsl(var(--primary))',
                              border: 'none', borderRadius: 7,
                              cursor: 'pointer',
                              color: copied ? 'hsl(var(--primary))' : 'hsl(var(--primary-foreground))',
                              flexShrink: 0, transition: 'background 0.15s',
                            }}
                          >
                            {copied ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Share actions */}
                      <div style={{ padding: '8px 6px' }}>
                        {[
                          {
                            label: 'Im Browser öffnen',
                            icon: <ExternalLink size={14} />,
                            onClick: () => window.open(shareUrl, '_blank'),
                          },
                          {
                            label: 'Per E-Mail teilen',
                            icon: <Mail size={14} />,
                            onClick: () => window.open(
                              `mailto:?subject=${encodeURIComponent(`${departure.trainNumber} — Live Zuginformationen`)}&body=${encodeURIComponent(shareUrl)}`
                            ),
                          },
                          {
                            label: 'WhatsApp',
                            icon: (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.682-1.228A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.239 0-4.308-.726-5.99-1.956l-.418-.312-3.06.803.817-2.984-.343-.545A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                              </svg>
                            ),
                            onClick: () => window.open(
                              `https://wa.me/?text=${encodeURIComponent(`${departure.trainNumber} Richtung ${departure.direction} — Live verfolgen: ${shareUrl}`)}`
                            ),
                          },
                        ].map(({ label, icon, onClick }) => (
                          <button
                            key={label}
                            onClick={onClick}
                            style={{
                              width: '100%',
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 10px',
                              background: 'none', border: 'none',
                              borderRadius: 7, cursor: 'pointer',
                              fontSize: 13, color: 'hsl(var(--foreground))',
                              textAlign: 'left',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--secondary))')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{icon}</span>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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
          </div>

          {/* Journey progress bar */}
          {data && !data.cancelled && (data.stopovers?.length ?? 0) > 1 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                height: 3, background: 'hsl(var(--secondary))',
                borderRadius: 2, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${Math.round((data.currentIdx / (data.stopovers.length - 1)) * 100)}%`,
                  background: 'hsl(var(--primary))', borderRadius: 2, transition: 'width 0.3s',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 4, fontSize: 10, color: 'hsl(var(--muted-foreground))',
              }}>
                <span>{data.origin}</span>
                <span style={{ color: 'hsl(var(--primary))' }}>● {data.stopovers[data.currentIdx]?.name}</span>
                <span>{data.destination}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Compact map ── */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {((data?.stopovers as any[])?.filter((s: any) => s.lat != null && s.lon != null).length ?? 0) >= 2 && (
          <div style={{ borderBottom: '1px solid hsl(var(--border))', flexShrink: 0 }}>
            <TrainRouteMap
              stopovers={data.stopovers}
              currentIdx={data.currentIdx}
              height={200}
            />
          </div>
        )}

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
              stop.platform && stop.platformActual !== stop.platform
            const showTime    = stop.plannedDeparture ?? stop.plannedArrival

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'stretch',
                padding: '0 20px',
                background: isCurrent ? 'rgba(45,212,176,0.04)' : 'transparent',
              }}>
                {/* Timeline */}
                <div style={{
                  width: 20, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', flexShrink: 0, marginRight: 14,
                }}>
                  {!isFirst && (
                    <div style={{ width: 2, flex: '0 0 12px', background: isPassed ? 'hsl(var(--primary))' : 'hsl(var(--border))' }} />
                  )}
                  <div style={{
                    width:  (isCurrent || isFirst || isLast) ? 12 : 8,
                    height: (isCurrent || isFirst || isLast) ? 12 : 8,
                    borderRadius: '50%',
                    background: (isCurrent || isPassed) ? 'hsl(var(--primary))' : (isFirst || isLast) ? 'hsl(var(--foreground))' : 'hsl(var(--secondary))',
                    border: (isCurrent || isPassed) ? '2px solid hsl(var(--primary))' : '2px solid hsl(var(--border))',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(45,212,176,0.15)' : 'none',
                    flexShrink: 0,
                  }} />
                  {!isLast && (
                    <div style={{ width: 2, flex: 1, minHeight: 12, background: (isPassed && !isCurrent) ? 'hsl(var(--primary))' : 'hsl(var(--border))' }} />
                  )}
                </div>

                {/* Stop content */}
                <div style={{
                  flex: 1, padding: '10px 0', minWidth: 0,
                  borderBottom: isLast ? 'none' : '1px solid hsl(var(--border) / 0.4)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        {showTime && (
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color: stop.cancelled ? '#ef4444' : isPassed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                            textDecoration: stop.cancelled ? 'line-through' : 'none',
                          }}>
                            {fmtTime(showTime)}
                          </span>
                        )}
                        {!stop.cancelled && maxDelay > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            +{maxDelay}
                          </span>
                        )}
                        {stop.cancelled && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            Ausfall
                          </span>
                        )}
                        {!isPassed && !stop.cancelled && maxDelay === 0 && !isFirst && !isLast && (
                          <span style={{ fontSize: 10, color: 'hsl(var(--primary))', opacity: 0.7 }}>pünktl.</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: (isCurrent || isFirst || isLast) ? 500 : 400,
                        color: (isCurrent || !isPassed) ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {stop.name}
                      </div>
                      {isCurrent && (
                        <div style={{ fontSize: 9, color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2, fontWeight: 600 }}>
                          ● Zug befindet sich hier
                        </div>
                      )}
                    </div>
                    {stop.platform && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 12, fontVariantNumeric: 'tabular-nums',
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
