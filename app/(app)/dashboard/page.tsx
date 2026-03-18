'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Bell, Calendar, Train, Clock, Plus } from 'lucide-react'
import { NewTripSheet } from '@/components/trips/NewTripSheet'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useEntitlements } from '@/hooks/useEntitlements'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardLeg {
  id: string
  position: number
  originName: string
  destName: string
  plannedDeparture: string
  plannedArrival: string
  actualDeparture?: string | null
  actualArrival?: string | null
  distanceKm?: number | null
  trainType?: string | null
  trainNumber?: string | null
  lineName?: string | null
  operator?: string | null
  delayMinutes?: number
  status?: string | null
}

interface TripWithLegs {
  id: string
  title: string
  description?: string | null
  status?: string | null
  startDate?: string | null
  endDate?: string | null
  legs: DashboardLeg[]
}

interface StationPoint {
  name: string
  shortName: string
  positionPct: number
  isPassed: boolean
  time: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function abbreviate(name: string | null | undefined): string {
  if (!name) return '–'
  const clean = name
    .replace(/\s*(Hauptbahnhof|Centraal|Central|Centrale|Hbf\.?)\s*/gi, '')
    .trim()
  return clean.substring(0, 3).toUpperCase()
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDateRange(dep: string | null | undefined, arr: string | null | undefined): string {
  if (!dep) return ''
  const d1 = new Date(dep)
  if (isNaN(d1.getTime())) return ''
  const fmt = (d: Date) => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  if (!arr) return fmt(d1)
  const d2 = new Date(arr)
  if (isNaN(d2.getTime()) || d1.toDateString() === d2.toDateString()) return fmt(d1)
  return `${fmt(d1)} – ${fmt(d2)}`
}

function buildProgressLine(legs: DashboardLeg[], now: Date): {
  stations: StationPoint[]
  livePositionPct: number | null
  currentTrainNumber: string | null
  etaMinutes: number | null
  totalDurationMs: number
} {
  const empty = { stations: [], livePositionPct: null, currentTrainNumber: null, etaMinutes: null, totalDurationMs: 0 }
  if (!legs.length) return empty

  const valid = legs.filter(l => l.plannedDeparture && l.plannedArrival)
  if (!valid.length) return empty

  const tripStart = new Date(valid[0].plannedDeparture).getTime()
  const tripEnd   = new Date(valid[valid.length - 1].plannedArrival).getTime()
  const totalDurationMs = tripEnd - tripStart
  if (totalDurationMs <= 0) return empty

  const nowMs = now.getTime()

  // Build de-duplicated station list preserving order
  const seen = new Set<string>()
  const stations: StationPoint[] = []

  for (let i = 0; i < valid.length; i++) {
    const leg = valid[i]
    const depMs = new Date(leg.plannedDeparture).getTime()
    const arrMs = new Date(leg.plannedArrival).getTime()

    const addStation = (name: string, ms: number, time: string) => {
      if (seen.has(name)) return
      seen.add(name)
      stations.push({
        name,
        shortName: abbreviate(name),
        positionPct: Math.max(0, Math.min(100, ((ms - tripStart) / totalDurationMs) * 100)),
        isPassed: nowMs > ms,
        time,
      })
    }

    addStation(leg.originName, depMs, formatTime(leg.plannedDeparture))
    addStation(leg.destName,   arrMs, formatTime(leg.plannedArrival))
  }

  stations.sort((a, b) => a.positionPct - b.positionPct)

  // Live position
  let livePositionPct: number | null = null
  let currentTrainNumber: string | null = null
  let etaMinutes: number | null = null

  if (nowMs >= tripStart && nowMs <= tripEnd) {
    livePositionPct = ((nowMs - tripStart) / totalDurationMs) * 100
    const currentLeg = valid.find(l => {
      const dep = new Date(l.plannedDeparture).getTime()
      const arr = new Date(l.plannedArrival).getTime()
      return nowMs >= dep && nowMs <= arr
    })
    if (currentLeg) {
      currentTrainNumber = currentLeg.trainNumber ?? currentLeg.lineName ?? null
      etaMinutes = Math.round((new Date(currentLeg.plannedArrival).getTime() - nowMs) / 60000)
    }
  }

  return { stations, livePositionPct, currentTrainNumber, etaMinutes, totalDurationMs }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    active:    { bg: '#0d2618', color: '#3ecf6e', border: '#1a4a2e', label: '● Aktiv' },
    planned:   { bg: '#0d1f3c', color: '#4f8ef7', border: '#1e3a6e', label: 'Geplant' },
    completed: { bg: '#141414', color: '#6b7280', border: '#242424', label: 'Abgeschlossen' },
    cancelled: { bg: '#1f0d0d', color: '#e25555', border: '#3a1515', label: 'Storniert' },
  }
  const s = map[status ?? 'planned'] ?? map.planned
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '3px 7px', borderRadius: 4, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'uppercase', letterSpacing: '0.6px',
    }}>
      {s.label}
    </span>
  )
}

function OperatorBadge({ operator }: { operator: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    DB:        { bg: '#2a0808', color: '#E32228' },
    ÖBB:       { bg: '#2a0808', color: '#C8102E' },
    SBB:       { bg: '#2a0808', color: '#EB0000' },
    SNCF:      { bg: '#1a0808', color: '#e07040' },
    NS:        { bg: '#081a10', color: '#00a650' },
    Eurostar:  { bg: '#1a1500', color: '#FBBF24' },
    Flixtrain: { bg: '#0a1f0a', color: '#74B43A' },
  }
  const c = colors[operator] ?? { bg: '#111e35', color: '#4a6a9a' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 3,
      background: c.bg, color: c.color,
    }}>
      {operator}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 12, overflow: 'hidden', height: 152 }}>
      <div style={{ padding: '18px 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ height: 8, borderRadius: 4, width: '60%', ...shimmerStyle }} />
        <div style={{ height: 28, borderRadius: 4, width: '100%', ...shimmerStyle }} />
        <div style={{ height: 8, borderRadius: 4, width: '40%', ...shimmerStyle }} />
        <div style={{ height: 8, borderRadius: 4, width: '80%', ...shimmerStyle }} />
      </div>
    </div>
  )
}

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg,#0d1f3c 25%,#111e35 50%,#0d1f3c 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
}

// ─── TripCard ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onClick }: { trip: TripWithLegs; onClick: () => void }) {
  const now = new Date()
  const sortedLegs = [...(trip.legs ?? [])].sort((a, b) =>
    new Date(a.plannedDeparture).getTime() - new Date(b.plannedDeparture).getTime()
  )
  const { stations, livePositionPct, currentTrainNumber, etaMinutes } = buildProgressLine(sortedLegs, now)
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const isActive  = trip.status === 'active'
  const isPlanned = trip.status === 'planned' || !trip.status

  const totalKm = sortedLegs.reduce((s, l) => s + (Number(l.distanceKm) || 0), 0)
  const uniqueOperators = [...new Set(sortedLegs.map(l => l.operator).filter(Boolean))] as string[]

  const firstDep = sortedLegs[0]?.plannedDeparture
  const lastArr  = sortedLegs[sortedLegs.length - 1]?.plannedArrival
  const dateRange = formatDateRange(firstDep, lastArr)

  // Track style depends on state
  const trackBg = isPlanned
    ? 'repeating-linear-gradient(90deg,#1e3a6e 0,#1e3a6e 5px,transparent 5px,transparent 11px)'
    : '#1e2d4a'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#0a1628',
        border: '1px solid #1e2d4a',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.12s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const t = e.currentTarget
        t.style.borderColor = '#4f8ef7'
        t.style.transform = 'translateY(-2px)'
        t.style.boxShadow = '0 8px 28px rgba(79,142,247,0.12)'
      }}
      onMouseLeave={e => {
        const t = e.currentTarget
        t.style.borderColor = '#1e2d4a'
        t.style.transform = 'translateY(0)'
        t.style.boxShadow = 'none'
      }}
    >
      {/* ── Progress track ── */}
      <div style={{ height: 72, padding: '0 18px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', position: 'relative', height: 40 }}>

          {/* Track background */}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: '50%', marginTop: -1, height: 2,
            background: trackBg, borderRadius: 2,
          }} />

          {/* Blue fill (active / completed portion) */}
          {livePositionPct !== null && (
            <div style={{
              position: 'absolute', left: 0,
              top: '50%', marginTop: -1, height: 2,
              width: `${livePositionPct}%`,
              background: '#4f8ef7', borderRadius: 2,
            }} />
          )}
          {trip.status === 'completed' && (
            <div style={{
              position: 'absolute', left: 0, right: 0,
              top: '50%', marginTop: -1, height: 2,
              background: '#1e3a6e', borderRadius: 2,
            }} />
          )}

          {/* Station dots + labels */}
          {stations.map((st, i) => {
            const isFirst = i === 0
            const isLast  = i === stations.length - 1
            const dotSize = (isFirst || isLast) ? 9 : 7
            const labelAlign = isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)'
            
            // Only show label if it's the first or last station on mobile
            const showLabel = !isMobile || isFirst || isLast
            
            return (
              <div key={i}>
                <div style={{
                  position: 'absolute',
                  left: `${st.positionPct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: dotSize, height: dotSize,
                  borderRadius: '50%',
                  background: st.isPassed ? '#4f8ef7' : '#080d1a',
                  border: `2px solid ${st.isPassed ? '#4f8ef7' : '#1e3a6e'}`,
                  zIndex: 2,
                }} />
                {showLabel && (
                  <div style={{
                    position: 'absolute',
                    left: `${st.positionPct}%`,
                    top: 'calc(50% + 8px)',
                    transform: labelAlign,
                    fontSize: isMobile ? 8 : 9,
                    color: st.isPassed ? '#4f8ef7' : '#4a6a9a',
                    whiteSpace: 'nowrap',
                    fontWeight: st.isPassed ? 500 : 400,
                    lineHeight: 1,
                    maxWidth: isMobile ? 36 : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {st.shortName}
                  </div>
                )}
              </div>
            )
          })}

          {/* Live position dot */}
          {livePositionPct !== null && (
            <div style={{
              position: 'absolute',
              left: `${livePositionPct}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}>
              {/* Pulse ring */}
              <div style={{
                position: 'absolute',
                inset: -5,
                borderRadius: '50%',
                background: 'rgba(62,207,110,0.22)',
                animation: 'live-pulse 2s ease-in-out infinite',
              }} />
              {/* Dot */}
              <div style={{
                width: 11, height: 11,
                borderRadius: '50%',
                background: '#3ecf6e',
                border: '2px solid #080d1a',
                position: 'relative',
              }} />
              {/* Train label */}
              {currentTrainNumber && (
                <div style={{
                  position: 'absolute',
                  bottom: 14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0d1f3c',
                  border: '1px solid #1e3a6e',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 9,
                  color: '#4f8ef7',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}>
                  {currentTrainNumber}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: '0 16px 14px' }}>
        {/* Title + status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#ffffff', lineHeight: 1.3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip.title}
          </div>
          <StatusBadge status={trip.status} />
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {dateRange && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4a6a9a' }}>
              <Calendar size={10} />
              {dateRange}
            </span>
          )}
          {sortedLegs.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4a6a9a' }}>
              <Train size={10} />
              {sortedLegs.length} {sortedLegs.length === 1 ? 'Abschnitt' : 'Abschnitte'}
            </span>
          )}
          {isActive && etaMinutes !== null && etaMinutes > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3ecf6e' }}>
              <Clock size={10} />
              Ank. in {etaMinutes}m
            </span>
          )}
        </div>

        {/* Footer: operators + km */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10, borderTop: '1px solid #1e2d4a',
        }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {uniqueOperators.slice(0, 3).map(op => (
              <OperatorBadge key={op} operator={op} />
            ))}
            {uniqueOperators.length > 3 && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: '#111e35', color: '#4a6a9a' }}>
                +{uniqueOperators.length - 3}
              </span>
            )}
          </div>
          {totalKm > 0 && (
            <span style={{ fontSize: 11, color: '#4a6a9a' }}>
              {Math.round(totalKm).toLocaleString('de-DE')} km
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Notification banner ──────────────────────────────────────────────────────

function NotifBanner() {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('notif-dismissed') === '1'
  })

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem('notif-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div style={{
      margin: '0 16px 16px',
      background: '#111e35',
      border: '1px solid #1e3a6e',
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      width: 'calc(100% - 32px)',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: 32, height: 32, background: '#1c1508', borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bell size={15} color="#f59e0b" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#f59e0b' }}>
          Verspätungsbenachrichtigungen aktivieren
        </div>
        <div style={{ fontSize: 11, color: '#4a6a9a', marginTop: 2 }}>
          Werde informiert wenn deine Züge verspätet oder gestrichen werden
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={dismiss} style={{
          fontSize: 12, color: '#4a6a9a', background: 'none',
          border: 'none', cursor: 'pointer', padding: '6px 10px',
        }}>
          Später
        </button>
        <button onClick={() => router.push('/settings/notifications')} style={{
          fontSize: 12, color: '#fff', background: '#f59e0b',
          border: 'none', borderRadius: 6, padding: '6px 14px',
          cursor: 'pointer', fontWeight: 500,
        }}>
          Aktivieren
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const { getLimit } = useEntitlements()

  const { data: trips, isLoading } = useQuery<TripWithLegs[]>({
    queryKey: ['trips', 'with-legs'],
    queryFn: async () => {
      const res = await fetch('/api/trips?legs=1')
      if (!res.ok) throw new Error('Failed to fetch trips')
      const json = await res.json() as { data: TripWithLegs[] }
      return json.data
    },
    refetchInterval: 60_000,
  })

  const maxTrips = getLimit('maxTrips')
  const atLimit  = maxTrips !== Infinity && (trips?.length ?? 0) >= maxTrips

  function handleNewTrip() {
    if (atLimit) setUpgradeOpen(true)
    else setSheetOpen(true)
  }

  return (
    <div style={{ minHeight: '100%', background: '#080d1a' }}>

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '20px 16px',
        flexWrap: 'nowrap',
        gap: 12,
        borderBottom: '1px solid #1e2d4a'
      }}>
        <h1 style={{
          fontSize: 'clamp(18px, 5vw, 24px)',
          fontWeight: 600,
          color: '#fff',
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          Meine Reisen
        </h1>
        <button
          onClick={handleNewTrip}
          style={{
            background: '#2563eb', 
            color: '#fff', 
            border: 'none',
            borderRadius: 8, 
            padding: '9px 14px',
            fontSize: 13, 
            fontWeight: 500, 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            gap: 5,
            flexShrink: 0, 
            whiteSpace: 'nowrap',
          }}
        >
          + Neue Reise
        </button>
      </div>

      <NotifBanner />

      {/* Loading */}
      {isLoading && (
        <div style={{ 
          padding: '0 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!trips || trips.length === 0) && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚂</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#ffffff', marginBottom: 8 }}>
            Noch keine Reisen
          </div>
          <div style={{ fontSize: 14, color: '#4a6a9a', marginBottom: 24 }}>
            Erstelle deine erste Reise und plane deine nächste Zugfahrt
          </div>
          <button
            onClick={handleNewTrip}
            style={{
              background: '#4f8ef7', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 24px', fontSize: 14,
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            Erste Reise erstellen
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && trips && trips.length > 0 && (
        <div style={{ 
          padding: '0 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {trips.map(trip => (
            <div key={trip.id} style={{ width: '100%', boxSizing: 'border-box' }}>
              <TripCard
                trip={trip}
                onClick={() => router.push(`/trips/${trip.id}`)}
              />
            </div>
          ))}
        </div>
      )}

      <NewTripSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <UpgradeModal feature="journal" open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  )
}
