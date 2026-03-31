'use client'

import { useState } from 'react'
import { X, Clock, AlertTriangle } from 'lucide-react'

interface Stop {
  name: string
  plannedArrival: string | null
  plannedDeparture: string | null
  platform: string | null
}

interface Leg {
  line: { name: string; operator?: { name: string } } | null
  origin: { name: string }
  destination: { name: string }
  plannedDeparture: string
  plannedArrival: string
  plannedDeparturePlatform: string | null
  plannedArrivalPlatform: string | null
  departurePlatform: string | null
  arrivalPlatform: string | null
  stopovers: Stop[]
}

interface JourneyDetailSheetProps {
  journey: {
    legs: Leg[]
    totalDuration: number
    changes: number
  }
  onClose: () => void
  onAddToTrip: () => void
}

export function JourneyDetailSheet({ journey, onClose, onAddToTrip }: JourneyDetailSheetProps) {
  const [expandedLegs, setExpandedLegs] = useState<Set<number>>(new Set())

  const toggleLeg = (i: number) => {
    setExpandedLegs(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–'

  const getTrainColor = (lineName: string | null | undefined) => {
    const n = (lineName ?? '').toUpperCase()
    if (n.startsWith('ICE') || n.startsWith('EC'))
      return { bg: '#2a0808', border: '#3a1515', color: '#E32228' }
    if (n.startsWith('IC') || n.startsWith('IR') || n.startsWith('RE') || n.startsWith('RB'))
      return { bg: '#111e35', border: '#1e3a6e', color: '#60a5fa' }
    if (n.startsWith('S') && n.length <= 3)
      return { bg: '#081a10', border: '#1a4a2e', color: '#3ecf6e' }
    if (n.includes('BUS') || n.startsWith('B'))
      return { bg: '#1a1200', border: '#3a2800', color: '#f59e0b' }
    return {
      bg: 'hsl(var(--secondary))',
      border: 'hsl(var(--border))',
      color: 'hsl(var(--muted-foreground))'
    }
  }

  const legs = journey.legs

  // ── Timeline primitives ──────────────────────────────────────────

  const Line = ({ type }: { type: 'train' | 'xfer' | 'xfer-warn' }) => (
    <div style={{
      width: 2,
      flex: 1,
      minHeight: 6,
      background: type === 'train' ? '#2dd4b0'
        : type === 'xfer-warn' ? '#f59e0b'
        : 'hsl(var(--muted-foreground))',
      opacity: type === 'train' ? 1 : 0.35,
    }} />
  )

  const Dot = ({ type }: {
    type: 'origin' | 'dest' | 'xfer' | 'xfer-warn' | 'mid'
  }) => {
    const styles: Record<string, React.CSSProperties> = {
      origin: {
        width: 10, height: 10, borderRadius: '50%',
        background: '#2dd4b0', flexShrink: 0,
        boxShadow: '0 0 0 3px rgba(45,212,176,0.15)',
      },
      dest: {
        width: 10, height: 10, borderRadius: '50%',
        background: 'hsl(var(--foreground))', flexShrink: 0,
      },
      xfer: {
        width: 7, height: 7, borderRadius: '50%',
        background: 'none', flexShrink: 0,
        border: '1.5px solid hsl(var(--border))',
      },
      'xfer-warn': {
        width: 7, height: 7, borderRadius: '50%',
        background: 'rgba(245,158,11,0.15)', flexShrink: 0,
        border: '1.5px solid #f59e0b',
      },
      mid: {
        width: 5, height: 5, borderRadius: '50%',
        background: 'hsl(var(--border))', flexShrink: 0,
      },
    }
    return <div style={styles[type]} />
  }

  const Row = ({
    topLine, dot, bottomLine, children, style
  }: {
    topLine?: 'train' | 'xfer' | 'xfer-warn' | null
    dot: 'origin' | 'dest' | 'xfer' | 'xfer-warn' | 'mid'
    bottomLine?: 'train' | 'xfer' | 'xfer-warn' | null
    children: React.ReactNode
    style?: React.CSSProperties
  }) => (
    <div style={{ display: 'flex', alignItems: 'stretch', ...style }}>
      <div style={{
        width: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', flexShrink: 0, marginRight: 14,
      }}>
        {topLine ? <Line type={topLine} /> : <div style={{ flex: 1 }} />}
        <Dot type={dot} />
        {bottomLine ? <Line type={bottomLine} /> : <div style={{ flex: 1 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 101,
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '14px 14px 0 0',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px', flexShrink: 0,
          borderBottom: '1px solid hsl(var(--border))',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--secondary))',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))',
            flexShrink: 0,
          }}>
            <X size={13} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 500,
              color: 'hsl(var(--foreground))',
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {legs[0]?.origin?.name} → {legs[legs.length - 1]?.destination?.name}
            </div>
            <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 1 }}>
              {Math.floor(journey.totalDuration / 60)}h {journey.totalDuration % 60}m
              {' · '}{journey.changes} Umstieg{journey.changes !== 1 ? 'e' : ''}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1, overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '14px 18px',
        }}>
          {legs.map((leg, i) => {
            const isLast = i === legs.length - 1
            const nextLeg = legs[i + 1]
            const xferMin = nextLeg
              ? Math.round((new Date(nextLeg.plannedDeparture).getTime() - new Date(leg.plannedArrival).getTime()) / 60000)
              : 0
            const isTight = xferMin > 0 && xferMin < 8
            const xferType: 'xfer' | 'xfer-warn' = isTight ? 'xfer-warn' : 'xfer'
            const trainColors = getTrainColor(leg.line?.name)
            const isExpanded = expandedLegs.has(i)
            const midStops = leg.stopovers ?? []
            const legDuration = Math.round(
              (new Date(leg.plannedArrival).getTime() - new Date(leg.plannedDeparture).getTime()) / 60000
            )

            return (
              <div key={i}>

                {/* ORIGIN (first leg only) */}
                {i === 0 && (
                  <Row dot="origin" bottomLine="train">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))',
                        fontVariantNumeric: 'tabular-nums', width: 42, flexShrink: 0,
                      }}>
                        {fmtTime(leg.plannedDeparture)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))', flex: 1 }}>
                        {leg.origin.name}
                      </span>
                      {leg.departurePlatform ?? leg.plannedDeparturePlatform ? (
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                          Gl. {leg.departurePlatform ?? leg.plannedDeparturePlatform}
                        </span>
                      ) : null}
                    </div>
                  </Row>
                )}

                {/* LEG LABEL */}
                <Row topLine="train" dot="mid" bottomLine="train" style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                      fontFamily: 'monospace',
                      background: trainColors.bg,
                      border: `1px solid ${trainColors.border}`,
                      color: trainColors.color,
                      flexShrink: 0,
                    }}>
                      {leg.line?.name ?? '?'}
                    </span>
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                      {legDuration} Min.
                    </span>
                    {midStops.length > 0 && (
                      <button
                        onClick={() => toggleLeg(i)}
                        style={{
                          marginLeft: 'auto', background: 'none', border: 'none',
                          fontSize: 11, color: '#2dd4b0', cursor: 'pointer', padding: 0,
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        {isExpanded ? 'Weniger ▴' : `${midStops.length} Zwischenhalte ▾`}
                      </button>
                    )}
                  </div>
                </Row>

                {/* INTERMEDIATE STOPS (expanded) */}
                {isExpanded && midStops.map((stop, si) => (
                  <Row key={si} topLine="train" dot="mid" bottomLine="train">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                      <span style={{
                        fontSize: 12, color: 'hsl(var(--muted-foreground))',
                        fontVariantNumeric: 'tabular-nums', width: 42, flexShrink: 0,
                      }}>
                        {fmtTime(stop.plannedDeparture ?? stop.plannedArrival)}
                      </span>
                      <span style={{
                        fontSize: 12, color: 'hsl(var(--muted-foreground))',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {stop.name}
                      </span>
                      {stop.platform && (
                        <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>
                          Gl. {stop.platform}
                        </span>
                      )}
                    </div>
                  </Row>
                ))}

                {/* ARRIVAL / TRANSFER */}
                {!isLast ? (
                  <>
                    {/* Arrival at transfer station */}
                    <Row topLine="train" dot={xferType} bottomLine={xferType}>
                      <div style={{ padding: '8px 0 2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 13, fontWeight: 500, color: 'hsl(var(--muted-foreground))',
                            fontVariantNumeric: 'tabular-nums', width: 42, flexShrink: 0,
                          }}>
                            {fmtTime(leg.plannedArrival)}
                          </span>
                          <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', flex: 1 }}>
                            {leg.destination.name}
                          </span>
                          {leg.arrivalPlatform ?? leg.plannedArrivalPlatform ? (
                            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                              Gl. {leg.arrivalPlatform ?? leg.plannedArrivalPlatform}
                            </span>
                          ) : null}
                        </div>

                        {/* Transfer badge */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12, fontWeight: 500,
                          padding: '4px 10px', borderRadius: 6,
                          border: `0.5px solid ${isTight ? 'rgba(245,158,11,0.3)' : 'hsl(var(--border))'}`,
                          background: isTight ? 'rgba(245,158,11,0.06)' : 'hsl(var(--secondary))',
                          color: isTight ? '#f59e0b' : 'hsl(var(--muted-foreground))',
                          marginBottom: 8,
                        }}>
                          {isTight ? <AlertTriangle size={11} /> : <Clock size={11} />}
                          {xferMin} Min. Umstieg
                        </div>
                      </div>
                    </Row>

                    {/* Departure from transfer station */}
                    <Row topLine={xferType} dot={xferType} bottomLine="train">
                      <div style={{ padding: '2px 0 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))',
                            fontVariantNumeric: 'tabular-nums', width: 42, flexShrink: 0,
                          }}>
                            {fmtTime(nextLeg.plannedDeparture)}
                          </span>
                          <span style={{ fontSize: 13, color: 'hsl(var(--foreground))', flex: 1 }}>
                            {nextLeg.origin.name}
                          </span>
                          {nextLeg.departurePlatform ?? nextLeg.plannedDeparturePlatform ? (
                            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                              Gl. {nextLeg.departurePlatform ?? nextLeg.plannedDeparturePlatform}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Row>
                  </>
                ) : (
                  /* FINAL DESTINATION */
                  <Row topLine="train" dot="dest" bottomLine={null}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))',
                        fontVariantNumeric: 'tabular-nums', width: 42, flexShrink: 0,
                      }}>
                        {fmtTime(leg.plannedArrival)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--foreground))', flex: 1 }}>
                        {leg.destination.name}
                      </span>
                      {leg.arrivalPlatform ?? leg.plannedArrivalPlatform ? (
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                          Gl. {leg.arrivalPlatform ?? leg.plannedArrivalPlatform}
                        </span>
                      ) : null}
                    </div>
                  </Row>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div style={{
          padding: '12px 16px', flexShrink: 0,
          borderTop: '1px solid hsl(var(--border))',
        }}>
          <button
            onClick={onAddToTrip}
            style={{
              width: '100%', height: 42,
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: 'none', borderRadius: 9,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Zur Reise hinzufügen
          </button>
        </div>
      </div>
    </>
  )
}
