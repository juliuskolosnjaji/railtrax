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

  // ── Dot on the timeline (absolutely positioned on border-left) ──

  const Dot = ({
    size, bg, border, boxShadow
  }: {
    size: number
    bg: string
    border?: string
    boxShadow?: string
  }) => (
    <div style={{
      position: 'absolute',
      left: -27,
      top: '50%',
      transform: 'translateY(-50%)',
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      border: border ? `1.5px solid ${border}` : 'none',
      boxShadow: boxShadow ?? 'none',
      zIndex: 1,
    }} />
  )

  // ── Content row with timeline border + dot ───────────────────────

  const Row = ({
    children, lineColor, dot
  }: {
    children: React.ReactNode
    lineColor: string
    dot?: { size: number; bg: string; border?: string; boxShadow?: string }
  }) => (
    <div style={{
      position: 'relative',
      padding: '8px 0',
      borderLeft: `2px solid ${lineColor}`,
      marginLeft: 9,
      paddingLeft: 20,
    }}>
      {dot && <Dot size={dot.size} bg={dot.bg} border={dot.border} boxShadow={dot.boxShadow} />}
      {children}
    </div>
  )

  // ── Transfer block (gray line, badge only, no dots) ──────────────

  const TransferBlock = ({
    xferMin, isTight
  }: {
    xferMin: number
    isTight: boolean
  }) => (
    <div style={{
      position: 'relative',
      padding: '10px 0',
      borderLeft: `2px solid ${isTight ? '#f59e0b' : 'hsl(var(--muted-foreground))'}`,
      marginLeft: 9,
      paddingLeft: 20,
      opacity: 0.35,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 500,
        padding: '4px 10px', borderRadius: 6,
        border: `0.5px solid ${isTight ? 'rgba(245,158,11,0.3)' : 'hsl(var(--border))'}`,
        background: isTight ? 'rgba(245,158,11,0.06)' : 'hsl(var(--secondary))',
        color: isTight ? '#f59e0b' : 'hsl(var(--muted-foreground))',
      }}>
        {isTight ? <AlertTriangle size={11} /> : <Clock size={11} />}
        {xferMin} Min. Umstieg
      </div>
    </div>
  )

  // ── Time + name + platform content ───────────────────────────────

  const StopContent = ({
    time, name, platform, bold, muted
  }: {
    time: string
    name: string
    platform?: string | null
    bold?: boolean
    muted?: boolean
  }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontSize: bold ? 14 : 13,
        fontWeight: bold ? 600 : 500,
        color: muted ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
        fontVariantNumeric: 'tabular-nums',
        width: 42, flexShrink: 0,
      }}>
        {time}
      </span>
      <span style={{
        fontSize: bold ? 14 : 13,
        fontWeight: bold ? 500 : 400,
        color: muted ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
        flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      {platform && (
        <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
          Gl. {platform}
        </span>
      )}
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
            const trainColors = getTrainColor(leg.line?.name)
            const isExpanded = expandedLegs.has(i)
            const midStops = leg.stopovers ?? []
            const legDuration = Math.round(
              (new Date(leg.plannedArrival).getTime() - new Date(leg.plannedDeparture).getTime()) / 60000
            )

            return (
              <div key={i}>

                {/* ═══ TRAIN SECTION — teal line ═══ */}
                <div style={{
                  borderLeft: '2px solid #2dd4b0',
                  marginLeft: 9,
                  paddingLeft: 20,
                }}>

                  {/* Origin (first leg) or Departure (transfer) */}
                  {i === 0 ? (
                    <Row lineColor="#2dd4b0" dot={{
                      size: 10, bg: '#2dd4b0',
                      boxShadow: '0 0 0 3px rgba(45,212,176,0.15)',
                    }}>
                      <StopContent
                        time={fmtTime(leg.plannedDeparture)}
                        name={leg.origin.name}
                        platform={leg.departurePlatform ?? leg.plannedDeparturePlatform}
                        bold
                      />
                    </Row>
                  ) : (
                    <Row lineColor="#2dd4b0" dot={{
                      size: 7, bg: 'hsl(var(--background))',
                      border: 'hsl(var(--border))',
                    }}>
                      <StopContent
                        time={fmtTime(leg.plannedDeparture)}
                        name={leg.origin.name}
                        platform={leg.departurePlatform ?? leg.plannedDeparturePlatform}
                      />
                    </Row>
                  )}

                  {/* Leg label — no dot */}
                  <div style={{
                    position: 'relative',
                    padding: '6px 0',
                    borderLeft: '2px solid #2dd4b0',
                    marginLeft: 9,
                    paddingLeft: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  </div>

                  {/* Intermediate stops (expanded) */}
                  {isExpanded && midStops.map((stop, si) => (
                    <Row key={si} lineColor="#2dd4b0" dot={{
                      size: 5, bg: 'hsl(var(--border))',
                    }}>
                      <StopContent
                        time={fmtTime(stop.plannedDeparture ?? stop.plannedArrival)}
                        name={stop.name}
                        platform={stop.platform}
                        muted
                      />
                    </Row>
                  ))}

                  {/* Arrival (not last) or Destination (last) */}
                  {isLast ? (
                    <Row lineColor="#2dd4b0" dot={{
                      size: 10, bg: 'hsl(var(--foreground))',
                    }}>
                      <StopContent
                        time={fmtTime(leg.plannedArrival)}
                        name={leg.destination.name}
                        platform={leg.arrivalPlatform ?? leg.plannedArrivalPlatform}
                        bold
                      />
                    </Row>
                  ) : (
                    <Row lineColor="#2dd4b0" dot={{
                      size: 7, bg: 'hsl(var(--background))',
                      border: 'hsl(var(--border))',
                    }}>
                      <StopContent
                        time={fmtTime(leg.plannedArrival)}
                        name={leg.destination.name}
                        platform={leg.arrivalPlatform ?? leg.plannedArrivalPlatform}
                        muted
                      />
                    </Row>
                  )}
                </div>

                {/* ═══ TRANSFER SECTION — gray/amber line ═══ */}
                {!isLast && (
                  <TransferBlock xferMin={xferMin} isTight={isTight} />
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
