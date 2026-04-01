'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Search, ArrowLeftRight, Calendar, Clock, ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { getWagenreihungUrl } from '@/lib/wagenreihung'
import { JourneyDetailSheet } from '@/components/trains/JourneyDetailSheet'
import { TrainDetailSheet } from '@/components/trains/TrainDetailSheet'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Station {
  id: string
  name: string
  lat?: number | null
  lon?: number | null
}

interface JourneyLeg {
  origin: string
  originIbnr: string | null
  originLat?: number | null
  originLon?: number | null
  destination: string
  destinationIbnr: string | null
  destinationLat?: number | null
  destinationLon?: number | null
  departure: string     // planned departure ISO
  arrival: string       // planned arrival ISO
  operator: string | null
  trainNumber: string
  platform: string | null
  delayMinutes: number
}

interface Journey {
  legs: JourneyLeg[]
  totalDuration: number   // computed client-side (minutes)
  changes: number         // computed client-side
  isBest?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function convertToDetailJourney(journey: Journey): any {
  return {
    legs: journey.legs.map(leg => ({
      origin: { name: leg.origin },
      destination: { name: leg.destination },
      line: {
        name: leg.trainNumber,
        operator: leg.operator ? { name: leg.operator } : undefined
      },
      plannedDeparture: leg.departure,
      plannedArrival: leg.arrival,
      plannedDeparturePlatform: leg.platform,
      plannedArrivalPlatform: leg.platform,
      departurePlatform: leg.platform,
      arrivalPlatform: leg.platform,
      stopovers: (leg as any).stopovers ?? [],
    })),
    totalDuration: journey.totalDuration,
    changes: journey.changes
  }
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '–'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '–'
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

function getOperatorColor(operator: string | null): { line: string; badge: string; text: string } {
  const op = (operator ?? '').toUpperCase()
  if (op.includes('DB') || op.includes('BAHN'))
    return { line: '#E32228', badge: '#2a0808', text: '#E32228' }
  if (op.includes('ÖBB') || op.includes('OBB'))
    return { line: '#C8102E', badge: '#2a0808', text: '#C8102E' }
  if (op.includes('SBB') || op.includes('CFF'))
    return { line: '#EB0000', badge: '#2a0808', text: '#EB0000' }
  if (op.includes('SNCF') || op.includes('THALYS'))
    return { line: '#e25555', badge: '#1f0808', text: '#e25555' }
  if (op.includes('TRENITALIA') || op.includes('TI'))
    return { line: '#3ecf6e', badge: '#081a10', text: '#3ecf6e' }
  return { line: 'hsl(var(--muted-foreground))', badge: 'hsl(var(--secondary))', text: 'hsl(var(--muted-foreground))' }
}

function resolveOperator(leg: JourneyLeg): string {
  if (leg.operator) return leg.operator
  const line = (leg.trainNumber ?? '').toUpperCase()
  if (line.startsWith('ICE') || line.startsWith('IC') || line.startsWith('EC')) return 'DB'
  if (line.startsWith('RJ') || line.startsWith('NJ')) return 'ÖBB'
  if (line.startsWith('TGV') || line.startsWith('OUIGO')) return 'SNCF'
  if (line.startsWith('FR') || line.startsWith('FA')) return 'Trenitalia'
  return ''
}

const VALID_OPERATORS = new Set(['DB', 'SBB', 'ÖBB', 'SNCF', 'Eurostar', 'NS', 'Renfe'])
function toOperatorEnum(op: string): string {
  if (VALID_OPERATORS.has(op)) return op
  return 'other'
}

// ─── StationInput ─────────────────────────────────────────────────────────────

function StationInput({
  label, value, query, onChange, onSelect, suggestions,
  onFocus, onBlur, placeholder, icon,
}: {
  label: string
  value: Station | null
  query: string
  onChange: (q: string) => void
  onSelect: (s: Station | null) => void
  suggestions?: Station[]
  onFocus: () => void
  onBlur: () => void
  placeholder: string
  icon: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', width: '100%', maxWidth: 280 }}>
      <div style={{
        fontSize: 10, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase',
        letterSpacing: '1px', fontWeight: 500,
      }}>
        {label}
      </div>
      <div style={{
        background: 'hsl(var(--background))',
        border: `1px solid ${value ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))'}`,
        borderRadius: 8, padding: '9px 12px',
        display: 'flex', alignItems: 'center', gap: 7,
        width: '100%', cursor: 'text',
      }}>
        {icon}
        <input
          value={value ? value.name : query}
          onChange={e => { onChange(e.target.value); onSelect(null) }}
          onFocus={onFocus}
          onBlur={() => setTimeout(onBlur, 150)}
          placeholder={placeholder}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: value ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
            fontSize: 13, width: '100%',
          }}
        />
        {value && (
          <button
            onClick={() => { onSelect(null); onChange('') }}
            style={{
              background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))',
              cursor: 'pointer', padding: 0, lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>
      {suggestions && suggestions.length > 0 && !value && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8,
          marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {suggestions.map(s => (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid hsl(var(--border))',
                fontSize: 13, color: 'hsl(var(--foreground))',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--secondary))')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
              </svg>
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── RouteStrip ───────────────────────────────────────────────────────────────

function RouteStrip({ legs, onTrainClick }: { legs: JourneyLeg[]; onTrainClick?: (trainNumber: string, departure?: string, operator?: string | null) => void }) {
  return (
    <div style={{
      overflowX: 'auto', paddingBottom: 4,
      scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        width: 'max-content', padding: '0 0 8px 0',
      }}>
        {legs.map((leg, i) => {
          const op = resolveOperator(leg)
          const colors = getOperatorColor(op)
          const isFirst = i === 0
          const isLast = i === legs.length - 1
          const delay = leg.delayMinutes ?? 0
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Station */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3, flexShrink: 0,
              }}>
                <div style={{
                  width: isFirst || isLast ? 10 : 8,
                  height: isFirst || isLast ? 10 : 8,
                  borderRadius: '50%',
                  background: isLast ? 'hsl(var(--muted-foreground))' : isFirst ? 'hsl(var(--foreground))' : 'hsl(var(--background))',
                  border: `2px solid ${isLast ? 'hsl(var(--muted-foreground))' : isFirst ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}`,
                }} />
                <div style={{
                  fontSize: 9, color: isFirst || isLast ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--muted-foreground))',
                  textAlign: 'center', maxWidth: 65, lineHeight: 1.3, whiteSpace: 'nowrap',
                }}>
                  {leg.origin.replace(/\s*(Hauptbahnhof|Hbf)\s*/gi, ' Hbf').trim()}
                </div>
                {leg.platform && (
                  <div style={{ fontSize: 8, color: 'hsl(var(--muted-foreground) / 0.6)' }}>Gl. {leg.platform}</div>
                )}
                <div style={{ fontSize: 8, color: delay > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }}>
                  {formatTime(leg.departure)}
                  {delay > 0 && ` +${delay}`}
                </div>
              </div>

              {/* Leg line */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', flexShrink: 0,
                minWidth: 80, paddingBottom: 20, paddingTop: 3,
              }}>
                <div style={{ height: 2, width: '100%', background: colors.line, borderRadius: 1 }} />
                <div
                  onClick={() => onTrainClick?.(leg.trainNumber, leg.departure, leg.operator)}
                  style={{
                    fontSize: 9, fontWeight: 500, padding: '2px 6px',
                    borderRadius: 3, whiteSpace: 'nowrap', marginTop: 4,
                    background: colors.badge, color: colors.text,
                    cursor: 'pointer',
                  }}
                >
                  {leg.trainNumber ?? '?'}
                </div>
                {(() => {
                  const url = getWagenreihungUrl({
                    trainNumber: leg.trainNumber,
                    operator: leg.operator,
                    originIbnr: leg.originIbnr,
                    departure: leg.departure,
                  })
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Wagenreihung"
                      style={{ display: 'flex', alignItems: 'center', marginTop: 3, color: 'hsl(var(--muted-foreground))' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="10" width="22" height="10" rx="2" />
                        <path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
                        <circle cx="7" cy="20" r="2" />
                        <circle cx="17" cy="20" r="2" />
                      </svg>
                    </a>
                  ) : null
                })()}
              </div>

              {/* Last station */}
              {isLast && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 3, flexShrink: 0,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'hsl(var(--muted-foreground))', border: '2px solid hsl(var(--muted-foreground))',
                  }} />
                  <div style={{
                    fontSize: 9, color: 'hsl(var(--secondary-foreground))', textAlign: 'center',
                    maxWidth: 65, lineHeight: 1.3, whiteSpace: 'nowrap',
                  }}>
                    {leg.destination.replace(/\s*(Hauptbahnhof|Hbf)\s*/gi, ' Hbf').trim()}
                  </div>
                  <div style={{ fontSize: 8, color: 'hsl(var(--muted-foreground))' }}>
                    {formatTime(leg.arrival)}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── TripPickerModal ──────────────────────────────────────────────────────────

function TripPickerModal({
  onSelect, onClose,
}: {
  onSelect: (tripId: string) => void
  onClose: () => void
}) {
  const router = useRouter()
  const { data: trips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => fetch('/api/trips').then(r => r.json()).then(d => d.data),
  })

  return (
    <div
      onClick={e => { e.stopPropagation(); onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
          borderRadius: 12, padding: 20, width: 320,
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 500, color: 'hsl(var(--foreground))', marginBottom: 16 }}>
          Zu welcher Reise hinzufügen?
        </div>

        <button
          onClick={() => { router.push('/dashboard?new=1'); onClose() }}
          style={{
            width: '100%', padding: '10px 14px', marginBottom: 8,
            background: 'hsl(var(--secondary))', border: '1px dashed hsl(var(--border))',
            borderRadius: 8, color: 'hsl(var(--muted-foreground))', fontSize: 13,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          + Neue Reise erstellen
        </button>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {trips?.map((trip: any) => (
          <button
            key={trip.id}
            onClick={() => onSelect(trip.id)}
            style={{
              width: '100%', padding: '10px 14px', marginBottom: 6,
              background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))',
              borderRadius: 8, color: 'hsl(var(--foreground))', fontSize: 13,
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground))')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
          >
            <span>{trip.title}</span>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
              {trip._count?.legs ?? trip.legs?.length ?? 0} Abschnitte
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── JourneyCard ──────────────────────────────────────────────────────────────

function JourneyCard({
  journey,
  onAdd,
  onDetail,
  onTrainClick
}: {
  journey: Journey;
  onAdd: (j: Journey) => void;
  onDetail?: (j: Journey) => void;
  onTrainClick?: (trainNumber: string, departure?: string, operator?: string | null) => void;
}) {
  const firstLeg = journey.legs[0]
  const lastLeg = journey.legs[journey.legs.length - 1]
  const depTime = formatTime(firstLeg?.departure)
  const arrTime = formatTime(lastLeg?.arrival)
  const totalDelay = journey.legs.reduce((sum, l) => sum + (l.delayMinutes ?? 0), 0)
  const uniqueOps = [...new Set(journey.legs.map(l => resolveOperator(l)).filter(Boolean))]

  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        border: `1px solid ${journey.isBest ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
        borderRadius: 12, overflow: 'hidden',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground))'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'hsl(var(--border))'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Best badge */}
      {journey.isBest && (
        <div style={{
          background: 'hsl(var(--secondary))', padding: '4px 16px',
          fontSize: 10, color: 'hsl(var(--muted-foreground))', fontWeight: 500,
          letterSpacing: '1px', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ⚡ Schnellste Verbindung
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12 }}>
          {/* Times */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1 }}>
            <span style={{ fontSize: 26, fontWeight: 500, color: 'hsl(var(--foreground))', letterSpacing: '-0.5px' }}>
              {depTime}
            </span>
            <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 18 }}>→</span>
            <span style={{ fontSize: 26, fontWeight: 500, color: 'hsl(var(--foreground))', letterSpacing: '-0.5px' }}>
              {arrTime}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                {formatDuration(journey.totalDuration)}
              </span>
              <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                {journey.changes === 0 ? 'Direkt' : `${journey.changes} Umstiege`}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {totalDelay > 0 ? (
              <span style={{
                fontSize: 10, padding: '3px 7px', borderRadius: 4,
                background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.3)',
              }}>+{totalDelay} min</span>
            ) : (
              <span style={{
                fontSize: 10, padding: '3px 7px', borderRadius: 4,
                background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))', border: '1px solid hsl(var(--success) / 0.3)',
              }}>pünktlich</span>
            )}
            <button
              onClick={e => { e.stopPropagation(); onAdd(journey) }}
              style={{
                background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--muted-foreground))', borderRadius: 8, padding: '8px 14px',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'hsl(var(--muted-foreground))'
                e.currentTarget.style.color = 'hsl(var(--background))'
                e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground))'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'hsl(var(--secondary))'
                e.currentTarget.style.color = 'hsl(var(--muted-foreground))'
                e.currentTarget.style.borderColor = 'hsl(var(--border))'
              }}
            >
              + Hinzufügen
            </button>
          </div>
        </div>

        {/* Route strip */}
        <RouteStrip
          legs={journey.legs}
          onTrainClick={onTrainClick}
        />
      </div>

      {/* Footer */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {uniqueOps.map(op => (
          <span key={op} style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4,
            background: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))', border: '1px solid hsl(var(--border))',
          }}>{op}</span>
        ))}
        <button
          onClick={() => onDetail?.(journey)}
          style={{
            marginLeft: 'auto', fontSize: 11, color: 'hsl(var(--muted-foreground))',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 3,
          }}
        >
          Alle Halte <ChevronDown size={10} />
        </button>
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined)
  const [pickerJourney, setPickerJourney] = useState<Journey | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])
  const [detailJourney, setDetailJourney] = useState<Journey | null>(null)
  const [detailTrain, setDetailTrain] = useState<{ trainNumber: string; departure?: string; operator?: string | null } | null>(null)

  const addLegsMutation = useMutation({
    mutationFn: async ({ journey, tripId }: { journey: Journey; tripId: string }) => {
      for (const leg of journey.legs) {
        const op = resolveOperator(leg)
        const res = await fetch('/api/legs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            originName: leg.origin,
            originIbnr: leg.originIbnr ?? undefined,
            originLat: leg.originLat ?? undefined,
            originLon: leg.originLon ?? undefined,
            plannedDeparture: leg.departure,
            destName: leg.destination,
            destIbnr: leg.destinationIbnr ?? undefined,
            destLat: leg.destinationLat ?? undefined,
            destLon: leg.destinationLon ?? undefined,
            plannedArrival: leg.arrival,
            operator: op ? toOperatorEnum(op) : undefined,
            trainNumber: leg.trainNumber || undefined,
            lineName: leg.trainNumber || undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error ?? `Failed to add leg (${res.status})`)
        }
      }
    },
    onSuccess: (_, { tripId }) => {
      setPickerJourney(null)
      router.push(`/trips/${tripId}`)
    },
  })

  const [from, setFrom] = useState<Station | null>(null)
  const [to, setTo] = useState<Station | null>(null)
  const [showVia, setShowVia] = useState(false)
  const [via, setVia] = useState<Station | null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [travelClass, setTravelClass] = useState<1 | 2>(2)
  const [sortBy, setSortBy] = useState<'departure' | 'duration' | 'changes'>('departure')
  const [filters, setFilters] = useState({
    onlyICE: false,
    direct: false,
    maxChanges2: false,
    night: false,
    bike: false,
  })

  // Autocomplete
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [viaQuery, setViaQuery] = useState('')
  const [fromFocus, setFromFocus] = useState(false)
  const [toFocus, setToFocus] = useState(false)
  const [viaFocus, setViaFocus] = useState(false)
  const debouncedFrom = useDebounce(fromQuery, 300)
  const debouncedTo = useDebounce(toQuery, 300)
  const debouncedVia = useDebounce(viaQuery, 300)

  // Recent searches
  const [recentSearches] = useState<{ from: Station; to: Station }[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('recent-searches') || '[]') }
    catch { return [] }
  })

  // Station autocomplete queries
  const { data: fromSuggestions } = useQuery({
    queryKey: ['stations', debouncedFrom],
    queryFn: () =>
      fetch(`/api/stations/search?q=${encodeURIComponent(debouncedFrom)}`)
        .then(r => r.json())
        .then(d => d.data as Station[]),
    enabled: debouncedFrom.length >= 2 && fromFocus,
    staleTime: 1000 * 60 * 60,
  })

  const { data: toSuggestions } = useQuery({
    queryKey: ['stations', debouncedTo],
    queryFn: () =>
      fetch(`/api/stations/search?q=${encodeURIComponent(debouncedTo)}`)
        .then(r => r.json())
        .then(d => d.data as Station[]),
    enabled: debouncedTo.length >= 2 && toFocus,
    staleTime: 1000 * 60 * 60,
  })

  const { data: viaSuggestions } = useQuery({
    queryKey: ['stations', debouncedVia],
    queryFn: () =>
      fetch(`/api/stations/search?q=${encodeURIComponent(debouncedVia)}`)
        .then(r => r.json())
        .then(d => d.data as Station[]),
    enabled: debouncedVia.length >= 2 && viaFocus,
    staleTime: 1000 * 60 * 60,
  })

  // Journey search
  const [searchParams, setSearchParams] = useState<{
    from: string; to: string; via?: string; datetime: string; class: number
    bike?: boolean; maxTransfers?: number; onlyLongDistance?: boolean
  } | null>(null)

  const { data: journeys, isLoading, isError, error } = useQuery({
    queryKey: ['journeys', searchParams],
    queryFn: async () => {
      if (!searchParams) return []
      const p = new URLSearchParams({
        from: searchParams.from,
        to: searchParams.to,
        datetime: searchParams.datetime,
        class: String(searchParams.class),
      })
      if (searchParams.via) p.set('via', searchParams.via)
      if (searchParams.bike) p.set('bike', 'true')
      if (searchParams.maxTransfers !== undefined) p.set('maxTransfers', String(searchParams.maxTransfers))
      if (searchParams.onlyLongDistance) p.set('onlyLongDistance', 'true')
      const res = await fetch(`/api/search/connections?${p}`)
      if (res.status === 503) throw new Error('service_unavailable')
      if (!res.ok) throw new Error('fetch_failed')
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = data.data ?? []
      const results: Journey[] = raw.map(j => ({
        legs: j.legs ?? [],
        totalDuration: j.legs?.length > 0
          ? Math.round((new Date(j.legs[j.legs.length - 1].arrival).getTime() - new Date(j.legs[0].departure).getTime()) / 60000)
          : 0,
        changes: (j.legs?.length ?? 1) - 1,
      }))
      if (results.length > 0) {
        const fastest = [...results].sort((a, b) => a.totalDuration - b.totalDuration)[0]
        fastest.isBest = true
      }
      return results
    },
    enabled: !!searchParams,
    staleTime: 1000 * 60 * 5,
  })

  // Handlers
  function handleSearch() {
    if (!from || !to) return
    const datetime = new Date(`${date}T${time}`).toISOString()

    let maxTransfers: number | undefined
    if (filters.direct) maxTransfers = 0
    else if (filters.maxChanges2) maxTransfers = 2

    setSearchParams({
      from: from.id,
      to: to.id,
      via: via?.id,
      datetime,
      class: travelClass,
      bike: filters.bike || undefined,
      maxTransfers,
      onlyLongDistance: filters.onlyICE || undefined,
    })
    try {
      const recent = JSON.parse(localStorage.getItem('recent-searches') || '[]')
      const updated = [{ from, to }, ...recent.filter((r: { from: Station; to: Station }) =>
        r.from.id !== from.id || r.to.id !== to.id
      )].slice(0, 5)
      localStorage.setItem('recent-searches', JSON.stringify(updated))
    } catch { /* ignore */ }
  }

  function handleShift(direction: 'earlier' | 'later') {
    const d = new Date(`${date}T${time}`)
    d.setHours(d.getHours() + (direction === 'later' ? 2 : -2))
    setDate(d.toISOString().slice(0, 10))
    setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    if (searchParams) {
      setSearchParams({ ...searchParams, datetime: d.toISOString() })
    }
  }

  const filtered = journeys ? [...journeys].sort((a, b) => {
    if (sortBy === 'duration') return a.totalDuration - b.totalDuration
    if (sortBy === 'changes') return a.changes - b.changes
    const aTime = new Date(a.legs[0]?.departure ?? 0).getTime()
    const bTime = new Date(b.legs[0]?.departure ?? 0).getTime()
    return aTime - bTime
  }) : []

  return (
    <>
    <div className="p-8 max-w-4xl mx-auto w-full">

      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Verbindungssuche</h1>
      <p className="text-sm text-muted-foreground mb-5">Zugverbindungen suchen und direkt zu deiner Reise hinzufügen</p>

      {user === null && (
        <div className="rounded-lg border border-border bg-secondary px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <span className="text-sm text-secondary-foreground">
            Verbindungen zu deinen Reisen hinzufügen — kostenlos anmelden
          </span>
          <a href="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap" style={{ textDecoration: 'none' }}>
            Anmelden →
          </a>
        </div>
      )}

      {/* ── Search card ── */}
      <div className="rounded-xl border border-border bg-card p-5 mb-5">
        {/* Top row */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          flexWrap: 'wrap', marginBottom: 14,
        }}>
          <StationInput
            label="Von"
            value={from}
            query={fromQuery}
            onChange={setFromQuery}
            onSelect={v => setFrom(v)}
            suggestions={fromSuggestions}
            onFocus={() => setFromFocus(true)}
            onBlur={() => setFromFocus(false)}
            placeholder="Abfahrtsbahnhof..."
            icon={
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
                <circle cx="6" cy="6" r="1.5" fill="hsl(var(--muted-foreground))" />
              </svg>
            }
          />

          {/* Swap button */}
          <button
            onClick={() => {
              const tmp = from; setFrom(to); setTo(tmp)
              const tq = fromQuery; setFromQuery(toQuery); setToQuery(tq)
            }}
            style={{
              width: 34, height: 36, background: 'hsl(var(--secondary))',
              border: '1px solid hsl(var(--border))', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ArrowLeftRight size={14} color="hsl(var(--muted-foreground))" />
          </button>

          <StationInput
            label="Nach"
            value={to}
            query={toQuery}
            onChange={setToQuery}
            onSelect={v => setTo(v)}
            suggestions={toSuggestions}
            onFocus={() => setToFocus(true)}
            onBlur={() => setToFocus(false)}
            placeholder="Zielbahnhof..."
            icon={
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
              </svg>
            }
          />

          {!showVia ? (
            <button
              onClick={() => setShowVia(true)}
              style={{
                fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px dashed hsl(var(--border))', background: 'none',
                color: 'hsl(var(--muted-foreground))', alignSelf: 'flex-end', height: 36,
              }}
            >
              + Via
            </button>
          ) : (
            <StationInput
              label="Via"
              value={via}
              query={viaQuery}
              onChange={setViaQuery}
              onSelect={v => setVia(v)}
              suggestions={viaSuggestions}
              onFocus={() => setViaFocus(true)}
              onBlur={() => setViaFocus(false)}
              placeholder="Zwischenstopp..."
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
                  <circle cx="6" cy="6" r="1.5" fill="hsl(var(--muted-foreground))" />
                </svg>
              }
            />
          )}

          {/* Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontSize: 10, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase',
              letterSpacing: '1px', fontWeight: 500,
            }}>Datum</div>
            <div style={{
              background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))',
              borderRadius: 8, padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Calendar size={11} color="hsl(var(--muted-foreground))" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'hsl(var(--foreground))', fontSize: 13, width: 110,
                }}
              />
            </div>
          </div>

          {/* Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontSize: 10, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase',
              letterSpacing: '1px', fontWeight: 500,
            }}>Zeit</div>
            <div style={{
              background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))',
              borderRadius: 8, padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Clock size={11} color="hsl(var(--muted-foreground))" />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'hsl(var(--foreground))', fontSize: 13, width: 70,
                }}
              />
            </div>
          </div>

          {/* Class */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontSize: 10, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase',
              letterSpacing: '1px', fontWeight: 500,
            }}>Klasse</div>
            <div style={{
              display: 'flex', background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))', borderRadius: 8, overflow: 'hidden',
            }}>
              {([2, 1] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setTravelClass(c)}
                  style={{
                    padding: '9px 14px', fontSize: 13, cursor: 'pointer', border: 'none',
                    background: travelClass === c ? 'hsl(var(--secondary))' : 'none',
                    color: travelClass === c ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {c}.
                </button>
              ))}
            </div>
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={!from || !to}
            style={{
              background: from && to ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
              color: from && to ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
              border: 'none', borderRadius: 8, padding: '10px 22px',
              fontSize: 13, fontWeight: 500,
              cursor: from && to ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap', height: 36, alignSelf: 'flex-end',
            }}
          >
            <Search size={13} />
            Suchen
          </button>
        </div>

        {/* Bottom row: quick filters + earlier/later */}
        <div style={{
          borderTop: '1px solid hsl(var(--border))', paddingTop: 12,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Schnellfilter:</span>
            {([
              { key: 'onlyICE', label: 'Nur ICE/IC' },
              { key: 'direct', label: 'Direkte Züge' },
              { key: 'maxChanges2', label: 'Max. 2 Umstiege' },
              { key: 'night', label: 'Nachtreise' },
              { key: 'bike', label: 'Fahrrad' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                style={{
                  fontSize: 11, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${filters[f.key] ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))'}`,
                  background: filters[f.key] ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--background))',
                  color: filters[f.key] ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Earlier / Later */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Früher</span>
            <div style={{
              display: 'flex', background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))', borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => handleShift('earlier')}
                style={{
                  padding: '6px 12px', background: 'none', border: 'none',
                  color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontSize: 13,
                }}
              >◀</button>
              <button
                onClick={() => handleShift('later')}
                style={{
                  padding: '6px 12px', background: 'none', border: 'none',
                  color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontSize: 13,
                  borderLeft: '1px solid hsl(var(--border))',
                }}
              >▶</button>
            </div>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Später</span>
          </div>
        </div>
      </div>

      {/* ── Recent searches ── */}
      {!searchParams && recentSearches.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Zuletzt gesucht
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {recentSearches.map((r, i) => (
              <button
                key={i}
                onClick={() => { setFrom(r.from); setTo(r.to); setVia(null); setShowVia(false) }}
                style={{
                  background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                  borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                  fontSize: 12, color: 'hsl(var(--secondary-foreground))',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {r.from.name.split(' ')[0]} → {r.to.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results header ── */}
      {journeys && journeys.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12,
        }}>
          <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
            {filtered.length} Verbindungen
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { key: 'departure', label: 'Abfahrt' },
              { key: 'duration', label: 'Dauer' },
              { key: 'changes', label: 'Umstiege' },
            ] as const).map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  background: sortBy === s.key ? 'hsl(var(--secondary))' : 'hsl(var(--card))',
                  border: `1px solid ${sortBy === s.key ? 'hsl(var(--border))' : 'hsl(var(--border))'}`,
                  color: sortBy === s.key ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card animate-pulse"
              style={{ height: 140 }}
            />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-5 text-center text-destructive text-sm">
          {(error as Error).message === 'service_unavailable'
            ? 'Verbindungssuche vorübergehend nicht verfügbar — bitte erneut versuchen'
            : 'Fehler bei der Suche — bitte erneut versuchen'}
        </div>
      )}

      {/* ── Results ── */}
      {journeys && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-muted-foreground text-sm">
              Keine Verbindungen gefunden — Filter anpassen oder andere Zeit wählen
            </div>
          ) : (
            filtered.map((journey, i) => (
              <JourneyCard
                key={i}
                journey={journey}
                onAdd={j => {
                  if (!user) {
                    router.push('/login?redirect=/search&reason=save_connection')
                    return
                  }
                  setPickerJourney(j)
                }}
                onDetail={j => setDetailJourney(j)}
                onTrainClick={(trainNumber, departure, operator) => setDetailTrain({ trainNumber, departure, operator })}
              />
            ))
          )}
        </div>
      )}
    </div>

    {pickerJourney && (
      <TripPickerModal
        onSelect={tripId => addLegsMutation.mutate({ journey: pickerJourney, tripId })}
        onClose={() => setPickerJourney(null)}
      />
    )}

    {detailJourney && (
      <JourneyDetailSheet
        journey={detailJourney}
        onClose={() => setDetailJourney(null)}
        onAddToTrip={() => {
          setDetailJourney(null)
          setPickerJourney(detailJourney)
        }}
      />
    )}

    {detailTrain && (
      <TrainDetailSheet
        trainNumber={detailTrain.trainNumber}
        date={detailTrain.departure ? new Date(detailTrain.departure).toISOString().slice(0, 10) : undefined}
        onClose={() => setDetailTrain(null)}
      />
    )}
    </>
  )
}
