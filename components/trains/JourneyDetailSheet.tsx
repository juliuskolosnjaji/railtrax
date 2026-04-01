'use client'

import { useState } from 'react'
import { X, Clock, AlertTriangle, ChevronDown } from 'lucide-react'

interface Props {
  journey: any
  onClose: () => void
  onAddToTrip: () => void
}

export function JourneyDetailSheet({ journey, onClose, onAddToTrip }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(i) ? s.delete(i) : s.add(i)
      return s
    })

  // ── Normalize a leg to consistent field names ──────────────
  const norm = (leg: any) => ({
    lineName:   leg.line?.name ?? leg.train?.name ?? leg.lineName ?? leg.trainNumber ?? '?',
    operator:   leg.line?.operator?.name ?? null,
    originName: leg.origin?.name ?? (typeof leg.origin === 'string' ? leg.origin : null) ?? leg.from?.name ?? '–',
    destName:   leg.destination?.name ?? (typeof leg.destination === 'string' ? leg.destination : null) ?? leg.to?.name ?? '–',
    dep:        leg.plannedDeparture ?? leg.departure ?? leg.plannedWhen ?? null,
    arr:        leg.plannedArrival   ?? leg.arrival   ?? leg.plannedWhen ?? null,
    depDelay:   leg.departureDelay != null ? Math.round(leg.departureDelay / 60) : (leg.delayMinutes ?? 0),
    arrDelay:   leg.arrivalDelay   != null ? Math.round(leg.arrivalDelay   / 60) : (leg.delayMinutes ?? 0),
    depPlat:    leg.departurePlatform ?? leg.plannedDeparturePlatform ?? leg.platform ?? null,
    arrPlat:    leg.arrivalPlatform   ?? leg.plannedArrivalPlatform   ?? leg.platform ?? null,
    stopovers:  (leg.stopovers ?? leg.intermediateStops ?? []).filter(
      (s: any) => {
        const n = s.stop?.name ?? s.name ?? ''
        const on = leg.origin?.name ?? (typeof leg.origin === 'string' ? leg.origin : '') ?? ''
        const dn = leg.destination?.name ?? (typeof leg.destination === 'string' ? leg.destination : '') ?? ''
        return n !== on && n !== dn
      }
    ),
    cancelled:  leg.cancelled ?? false,
  })

  // ── Format time ────────────────────────────────────────────
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return '–'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return '–'
      return d.toLocaleTimeString('de-DE', {
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return '–' }
  }

  // ── Duration between two ISO strings ──────────────────────
  const durMin = (a: string | null, b: string | null) => {
    if (!a || !b) return 0
    const d = Math.round(
      (new Date(b).getTime() - new Date(a).getTime()) / 60000
    )
    return isNaN(d) ? 0 : Math.abs(d)
  }

  // ── Transfer duration ──────────────────────────────────────
  const xferMin = (leg: any, next: any) => {
    const arr = leg.plannedArrival ?? leg.arrival ?? null
    const dep = next.plannedDeparture ?? next.departure ?? null
    if (!arr || !dep) return 0
    const d = Math.round(
      (new Date(dep).getTime() - new Date(arr).getTime()) / 60000
    )
    return isNaN(d) ? 0 : Math.max(0, d)
  }

  // ── Train badge colors ─────────────────────────────────────
  const badgeStyle = (lineName: string) => {
    const n = lineName.toUpperCase().replace(/\s+/g, '')
    if (n.startsWith('ICE') || n.startsWith('EC'))
      return { bg: '#FCEBEB', border: '#E24B4A', color: '#791F1F' }
    if (n.startsWith('TGV') || n.startsWith('RJ') || n.startsWith('EST'))
      return { bg: '#EEEDFE', border: '#7F77DD', color: '#26215C' }
    if (n.startsWith('BUS') || n.match(/^B\d/))
      return { bg: '#FAEEDA', border: '#EF9F27', color: '#633806' }
    if (n.startsWith('S') && n.length <= 3)
      return { bg: '#EAF3DE', border: '#639922', color: '#173404' }
    // IC, IR, RE, RB, R, default teal
    return { bg: '#E1F5EE', border: '#1D9E75', color: '#085041' }
  }

  // ── Total journey duration ─────────────────────────────────
  const legs = journey.legs ?? []
  const normed = legs.map(norm)
  const firstLeg = normed[0]
  const lastLeg  = normed[normed.length - 1]
  const totalMin = durMin(firstLeg?.dep, lastLeg?.arr)
  const totalH   = Math.floor(totalMin / 60)
  const totalM   = totalMin % 60

  // ── Sub-components ─────────────────────────────────────────

  // Vertical line segment
  const Line = ({ type }: { type: 'teal' | 'gray' | 'amber' }) => (
    <div style={{
      width: 2,
      flex: 1,
      minHeight: 6,
      background: type === 'teal'  ? '#1D9E75'
                : type === 'amber' ? '#EF9F27'
                : 'var(--border, #ccc)',
      opacity: type === 'teal' ? 1 : type === 'amber' ? 0.6 : 0.45,
    }} />
  )

  // Dot on timeline
  const Dot = ({ type }: {
    type: 'origin' | 'dest' | 'via' | 'xfer' | 'xfer-amber'
  }) => {
    const s: React.CSSProperties = {
      borderRadius: '50%',
      flexShrink: 0,
      zIndex: 2,
      position: 'relative',
    }
    if (type === 'origin') return <div style={{
      ...s, width: 10, height: 10,
      background: '#1D9E75',
      boxShadow: '0 0 0 3px #E1F5EE',
    }} />
    if (type === 'dest') return <div style={{
      ...s, width: 10, height: 10,
      background: 'var(--foreground, #000)',
    }} />
    if (type === 'via') return <div style={{
      ...s, width: 7, height: 7,
      background: 'var(--background, #fff)',
      border: '1.5px solid #1D9E75',
    }} />
    if (type === 'xfer-amber') return <div style={{
      ...s, width: 7, height: 7,
      background: '#FAEEDA',
      border: '1.5px solid #EF9F27',
    }} />
    return <div style={{
      ...s, width: 7, height: 7,
      background: 'var(--background, #fff)',
      border: '1.5px solid var(--border, #ccc)',
    }} />
  }

  // Row wrapper (timeline col + content)
  const Row = ({
    top, dot, bottom, children, style
  }: {
    top?: 'teal'|'gray'|'amber'|null
    dot: 'origin'|'dest'|'via'|'xfer'|'xfer-amber'
    bottom?: 'teal'|'gray'|'amber'|null
    children: React.ReactNode
    style?: React.CSSProperties
  }) => (
    <div style={{ display: 'flex', alignItems: 'stretch', ...style }}>
      <div style={{
        width: 20, display: 'flex', flexDirection: 'column',
        alignItems: 'center', flexShrink: 0, marginRight: 16,
      }}>
        {top ? <Line type={top} /> : <div style={{ flex: 1 }} />}
        <Dot type={dot} />
        {bottom ? <Line type={bottom} /> : <div style={{ flex: 1 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )

  // Stop row (time + name + platform)
  const StopLine = ({
    time, delay, name, platform, muted, bold
  }: {
    time: string | null
    delay?: number
    name: string
    platform?: string | null
    muted?: boolean
    bold?: boolean
  }) => (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: 10, padding: '9px 0',
    }}>
      <span style={{
        fontSize: 13, fontVariantNumeric: 'tabular-nums',
        width: 44, flexShrink: 0, fontWeight: bold ? 500 : 400,
        color: muted
          ? 'hsl(var(--muted-foreground))'
          : 'hsl(var(--foreground))',
      }}>
        {time ?? '–'}
        {(delay ?? 0) > 0 && (
          <span style={{ fontSize: 10, color: '#E24B4A', marginLeft: 3 }}>
            +{delay}
          </span>
        )}
      </span>
      <span style={{
        fontSize: 13, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontWeight: bold ? 500 : 400,
        color: muted
          ? 'hsl(var(--muted-foreground))'
          : 'hsl(var(--foreground))',
      }}>
        {name}
      </span>
      {platform && (
        <span style={{
          fontSize: 11, flexShrink: 0,
          color: 'hsl(var(--muted-foreground))',
          fontVariantNumeric: 'tabular-nums',
        }}>
          Gl. {platform}
        </span>
      )}
    </div>
  )

  // Transfer card — combines arrival + wait + departure in one block
  const TransferCard = ({
    arrTime, arrDelay, arrName, arrPlat,
    depTime, depDelay, depName, depPlat,
    xfer, tight,
  }: {
    arrTime: string | null; arrDelay: number; arrName: string; arrPlat: string | null
    depTime: string | null; depDelay: number; depName: string; depPlat: string | null
    xfer: number; tight: boolean
  }) => {
    const longWait = xfer >= 30
    const borderColor = tight ? '#EF9F27' : longWait ? 'hsl(var(--border))' : 'hsl(var(--border))'
    const bg = tight ? 'rgba(239,159,39,0.07)' : 'hsl(var(--secondary))'
    const timeW = 44

    return (
      <div style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        background: bg,
        overflow: 'hidden',
        margin: '2px 0',
      }}>
        {/* Arrival row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 4px' }}>
          <span style={{
            fontSize: 13, fontVariantNumeric: 'tabular-nums',
            width: timeW, flexShrink: 0,
            color: 'hsl(var(--muted-foreground))',
          }}>
            {arrTime ?? '–'}
            {arrDelay > 0 && <span style={{ fontSize: 10, color: '#E24B4A', marginLeft: 3 }}>+{arrDelay}</span>}
          </span>
          <span style={{
            fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'hsl(var(--muted-foreground))',
          }}>{arrName}</span>
          {arrPlat && <span style={{ fontSize: 11, flexShrink: 0, color: 'hsl(var(--muted-foreground))' }}>Gl. {arrPlat}</span>}
        </div>

        {/* Wait indicator */}
        <div style={{ padding: '3px 12px 3px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ height: 1, width: timeW, flexShrink: 0, background: 'hsl(var(--border))', opacity: 0.5 }} />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: tight ? '#633806' : longWait ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
          }}>
            {tight ? <AlertTriangle size={10} color="#EF9F27" /> : <Clock size={10} />}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {longWait ? `${Math.floor(xfer / 60)}h ${xfer % 60}m` : `${xfer} Min.`} Umstieg
              {depPlat ? ` · Gl. ${depPlat}` : ''}
            </span>
          </div>
        </div>

        {/* Departure row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 8px' }}>
          <span style={{
            fontSize: 13, fontVariantNumeric: 'tabular-nums',
            width: timeW, flexShrink: 0, fontWeight: 500,
            color: 'hsl(var(--foreground))',
          }}>
            {depTime ?? '–'}
            {depDelay > 0 && <span style={{ fontSize: 10, color: '#E24B4A', marginLeft: 3 }}>+{depDelay}</span>}
          </span>
          <span style={{
            fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: 500, color: 'hsl(var(--foreground))',
          }}>{depName}</span>
          {depPlat && <span style={{ fontSize: 11, flexShrink: 0, color: 'hsl(var(--muted-foreground))' }}>Gl. {depPlat}</span>}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(2px)',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 101,
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '16px 16px 0 0',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.2s ease-out',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', flexShrink: 0,
          borderBottom: '1px solid hsl(var(--border))',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button onClick={onClose} style={{
            width: 28, height: 28, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'hsl(var(--secondary))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8, cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))',
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
              {firstLeg?.originName} → {lastLeg?.destName}
            </div>
            <div style={{
              fontSize: 12, color: 'hsl(var(--muted-foreground))',
              marginTop: 2,
            }}>
              {totalH}h {totalM}m · {journey.changes ?? legs.length - 1} Umstieg{(journey.changes ?? legs.length - 1) !== 1 ? 'e' : ''}
            </div>
          </div>

          {/* Overall delay */}
          {(lastLeg?.arrDelay ?? 0) > 0 ? (
            <span style={{
              fontSize: 11, fontWeight: 500, flexShrink: 0,
              padding: '3px 10px', borderRadius: 20,
              background: '#FCEBEB', color: '#791F1F',
              border: '0.5px solid #E24B4A',
            }}>
              +{lastLeg.arrDelay} Min.
            </span>
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 500, flexShrink: 0,
              padding: '3px 10px', borderRadius: 20,
              background: '#E1F5EE', color: '#085041',
              border: '0.5px solid #1D9E75',
            }}>
              Pünktlich
            </span>
          )}
        </div>

        {/* Scrollable timeline */}
        <div style={{
          flex: 1, overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px 20px 8px',
        }}>
          {normed.map((leg: any, i: number) => {
            const isLast  = i === normed.length - 1
            const nextLeg = normed[i + 1]
            const rawNext = legs[i + 1]
            const xfer    = nextLeg ? xferMin(legs[i], rawNext) : 0
            const tight   = xfer > 0 && xfer < 8
            const xferT   = tight ? 'amber' : 'gray'
            const isExp   = expanded.has(i)
            const bs      = badgeStyle(leg.lineName)
            const legDur  = durMin(leg.dep, leg.arr)
            const mids    = leg.stopovers

            return (
              <div key={i}>

                {/* ── ORIGIN (first leg only) ── */}
                {i === 0 && (
                  <Row dot="origin" bottom="teal">
                    <StopLine
                      time={fmt(leg.dep)}
                      delay={leg.depDelay}
                      name={leg.originName}
                      platform={leg.depPlat}
                      bold
                    />
                  </Row>
                )}

                {/* ── LEG LABEL ── */}
                <Row top="teal" dot="via" bottom="teal">
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 8, padding: '4px 0',
                  }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px',
                      borderRadius: 6,
                      fontFamily: 'var(--font-mono, monospace)',
                      background: bs.bg,
                      border: `0.5px solid ${bs.border}`,
                      color: bs.color,
                      flexShrink: 0,
                      letterSpacing: '0.01em',
                    }}>
                      {leg.lineName}
                    </span>
                    <span style={{
                      fontSize: 12,
                      color: 'hsl(var(--muted-foreground))',
                    }}>
                      {legDur} Min.
                    </span>
                    {mids.length > 0 && (
                      <button
                        onClick={() => toggle(i)}
                        style={{
                          marginLeft: 'auto',
                          display: 'flex', alignItems: 'center', gap: 3,
                          background: 'none', border: 'none',
                          fontSize: 11,
                          color: 'hsl(var(--primary, #1D9E75))',
                          cursor: 'pointer', padding: 0,
                        }}
                      >
                        <ChevronDown
                          size={13}
                          style={{
                            transform: isExp
                              ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.18s',
                          }}
                        />
                        {mids.length} Zwischenhalt{mids.length > 1 ? 'e' : ''}
                      </button>
                    )}
                  </div>
                </Row>

                {/* ── INTERMEDIATE STOPS ── */}
                {isExp && mids.map((s: any, si: number) => (
                  <Row key={si} top="teal" dot="via" bottom="teal">
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: 10, padding: '5px 0',
                    }}>
                      <span style={{
                        fontSize: 12, width: 44, flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'hsl(var(--muted-foreground))',
                      }}>
                        {fmt(
                          s.plannedDeparture ?? s.departure
                          ?? s.plannedArrival ?? s.arrival
                          ?? s.plannedWhen
                        )}
                      </span>
                      <span style={{
                        fontSize: 12, flex: 1,
                        color: 'hsl(var(--muted-foreground))',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {s.stop?.name ?? s.name ?? '–'}
                      </span>
                      {(s.platform ?? s.plannedPlatform) && (
                        <span style={{
                          fontSize: 11,
                          color: 'hsl(var(--muted-foreground))',
                        }}>
                          Gl. {s.platform ?? s.plannedPlatform}
                        </span>
                      )}
                    </div>
                  </Row>
                ))}

                {/* ── TRANSFER or DESTINATION ── */}
                {!isLast ? (
                  <>
                    {/* Single transfer card row */}
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <div style={{
                        width: 20, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', flexShrink: 0, marginRight: 16,
                      }}>
                        <Line type="teal" />
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0, zIndex: 2,
                          background: tight ? '#FAEEDA' : 'hsl(var(--background))',
                          border: `1.5px solid ${tight ? '#EF9F27' : 'hsl(var(--border))'}`,
                        }} />
                        <Line type="teal" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, padding: '4px 0' }}>
                        <TransferCard
                          arrTime={fmt(leg.arr)}
                          arrDelay={leg.arrDelay}
                          arrName={leg.destName}
                          arrPlat={leg.arrPlat}
                          depTime={fmt(nextLeg.dep)}
                          depDelay={nextLeg.depDelay}
                          depName={nextLeg.originName}
                          depPlat={nextLeg.depPlat}
                          xfer={xfer}
                          tight={tight}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── DESTINATION ── */
                  <Row top="teal" dot="dest" bottom={null}>
                    <StopLine
                      time={fmt(leg.arr)}
                      delay={leg.arrDelay}
                      name={leg.destName}
                      platform={leg.arrPlat}
                      bold
                    />
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
              background: '#1D9E75', color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            + Zur Reise hinzufügen
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
