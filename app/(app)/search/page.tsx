'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ArrowLeftRight, Calendar, Clock, ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Station {
  id: string
  name: string
  lat?: number | null
  lon?: number | null
}

interface JourneyLeg {
  origin: string
  originIbnr: string
  destination: string
  destinationIbnr: string
  departure: string
  arrival: string
  plannedDeparture: string
  plannedArrival: string
  operator: string | null
  trainNumber: string | null
  lineName: string | null
  platform: string | null
  delay: number
  cancelled: boolean
}

interface Journey {
  id: string
  legs: JourneyLeg[]
  totalDuration: number
  changes: number
  operators: string[]
  isBest?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return { line: '#6b7280', badge: '#111e35', text: '#6b7280' }
}

function resolveOperator(leg: JourneyLeg): string {
  if (leg.operator) return leg.operator
  const line = (leg.lineName ?? leg.trainNumber ?? '').toUpperCase()
  if (line.startsWith('ICE') || line.startsWith('IC') || line.startsWith('EC')) return 'DB'
  if (line.startsWith('RJ') || line.startsWith('NJ')) return 'ÖBB'
  if (line.startsWith('TGV') || line.startsWith('OUIGO')) return 'SNCF'
  if (line.startsWith('FR') || line.startsWith('FA')) return 'Trenitalia'
  return ''
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
      <div style={{
        fontSize: 10, color: '#4a6a9a', textTransform: 'uppercase',
        letterSpacing: '1px', fontWeight: 500,
      }}>
        {label}
      </div>
      <div style={{
        background: '#080d1a',
        border: `1px solid ${value ? '#4f8ef7' : '#1e2d4a'}`,
        borderRadius: 8, padding: '9px 12px',
        display: 'flex', alignItems: 'center', gap: 7,
        minWidth: 200, cursor: 'text',
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
            color: value ? '#fff' : '#4a6a9a',
            fontSize: 13, width: '100%',
          }}
        />
        {value && (
          <button
            onClick={() => { onSelect(null); onChange('') }}
            style={{
              background: 'none', border: 'none', color: '#4a6a9a',
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
          background: '#0a1628', border: '1px solid #1e2d4a', borderRadius: 8,
          marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {suggestions.map(s => (
            <div
              key={s.id}
              onClick={() => onSelect(s)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid #1e2d4a',
                fontSize: 13, color: '#fff',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0d1f3c')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="#4a6a9a" strokeWidth="1.5" />
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

function RouteStrip({ legs }: { legs: JourneyLeg[] }) {
  return (
    <div style={{
      overflowX: 'auto', paddingBottom: 4,
      scrollbarWidth: 'thin', scrollbarColor: '#1e2d4a transparent',
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
          const delay = leg.delay ?? 0
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
                  background: isLast ? '#4f8ef7' : isFirst ? '#fff' : '#080d1a',
                  border: `2px solid ${isLast ? '#4f8ef7' : isFirst ? '#fff' : '#4a6a9a'}`,
                }} />
                <div style={{
                  fontSize: 9, color: isFirst || isLast ? '#8ba3c7' : '#4a6a9a',
                  textAlign: 'center', maxWidth: 65, lineHeight: 1.3, whiteSpace: 'nowrap',
                }}>
                  {leg.origin.replace(/\s*(Hauptbahnhof|Hbf)\s*/gi, ' Hbf').trim()}
                </div>
                {leg.platform && (
                  <div style={{ fontSize: 8, color: '#1e3a6e' }}>Gl. {leg.platform}</div>
                )}
                <div style={{ fontSize: 8, color: delay > 0 ? '#e25555' : '#4a6a9a' }}>
                  {formatTime(leg.plannedDeparture)}
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
                <div style={{
                  fontSize: 9, fontWeight: 500, padding: '2px 6px',
                  borderRadius: 3, whiteSpace: 'nowrap', marginTop: 4,
                  background: colors.badge, color: colors.text,
                }}>
                  {leg.lineName ?? leg.trainNumber ?? '?'}
                </div>
              </div>

              {/* Last station */}
              {isLast && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 3, flexShrink: 0,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#4f8ef7', border: '2px solid #4f8ef7',
                  }} />
                  <div style={{
                    fontSize: 9, color: '#8ba3c7', textAlign: 'center',
                    maxWidth: 65, lineHeight: 1.3, whiteSpace: 'nowrap',
                  }}>
                    {leg.destination.replace(/\s*(Hauptbahnhof|Hbf)\s*/gi, ' Hbf').trim()}
                  </div>
                  <div style={{ fontSize: 8, color: '#4a6a9a' }}>
                    {formatTime(leg.plannedArrival)}
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
          background: '#0a1628', border: '1px solid #1e2d4a',
          borderRadius: 12, padding: 20, width: 320,
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 16 }}>
          Zu welcher Reise hinzufügen?
        </div>

        <button
          onClick={() => { router.push('/dashboard?new=1'); onClose() }}
          style={{
            width: '100%', padding: '10px 14px', marginBottom: 8,
            background: '#0d1f3c', border: '1px dashed #1e3a6e',
            borderRadius: 8, color: '#4f8ef7', fontSize: 13,
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
              background: '#080d1a', border: '1px solid #1e2d4a',
              borderRadius: 8, color: '#fff', fontSize: 13,
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e2d4a')}
          >
            <span>{trip.title}</span>
            <span style={{ fontSize: 11, color: '#4a6a9a' }}>
              {trip._count?.legs ?? trip.legs?.length ?? 0} Abschnitte
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── JourneyCard ──────────────────────────────────────────────────────────────

function JourneyCard({ journey }: { journey: Journey }) {
  const router = useRouter()
  const [showTripPicker, setShowTripPicker] = useState(false)

  const addLegMutation = useMutation({
    mutationFn: async ({ journey, tripId }: { journey: Journey; tripId: string }) => {
      for (const leg of journey.legs) {
        await fetch('/api/legs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trip_id: tripId,
            origin_name: leg.origin,
            origin_ibnr: leg.originIbnr,
            destination_name: leg.destination,
            destination_ibnr: leg.destinationIbnr,
            planned_departure: leg.plannedDeparture,
            planned_arrival: leg.plannedArrival,
            operator: leg.operator,
            train_number: leg.trainNumber,
            line_name: leg.lineName,
            platform_planned: leg.platform,
          }),
        })
      }
    },
  })

  const firstLeg = journey.legs[0]
  const lastLeg = journey.legs[journey.legs.length - 1]
  const depTime = formatTime(firstLeg?.plannedDeparture)
  const arrTime = formatTime(lastLeg?.plannedArrival)
  const totalDelay = lastLeg?.delay ?? 0
  const uniqueOps = [...new Set(journey.legs.map(l => resolveOperator(l)).filter(Boolean))]

  return (
    <div
      style={{
        background: '#0a1628',
        border: `1px solid ${journey.isBest ? '#1e3a6e' : '#1e2d4a'}`,
        borderRadius: 12, overflow: 'hidden',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#4f8ef7'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = journey.isBest ? '#1e3a6e' : '#1e2d4a'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Best badge */}
      {journey.isBest && (
        <div style={{
          background: '#0d1f3c', padding: '4px 16px',
          fontSize: 10, color: '#4f8ef7', fontWeight: 500,
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
            <span style={{ fontSize: 26, fontWeight: 500, color: '#fff', letterSpacing: '-0.5px' }}>
              {depTime}
            </span>
            <span style={{ color: '#1e3a6e', fontSize: 18 }}>→</span>
            <span style={{ fontSize: 26, fontWeight: 500, color: '#fff', letterSpacing: '-0.5px' }}>
              {arrTime}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: '#4a6a9a' }}>
                {formatDuration(journey.totalDuration)}
              </span>
              <span style={{ fontSize: 11, color: '#4a6a9a' }}>
                {journey.changes === 0 ? 'Direkt' : `${journey.changes} Umstiege`}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {totalDelay > 0 ? (
              <span style={{
                fontSize: 10, padding: '3px 7px', borderRadius: 4,
                background: '#1f0d0d', color: '#e25555', border: '1px solid #3a1515',
              }}>+{totalDelay} min</span>
            ) : (
              <span style={{
                fontSize: 10, padding: '3px 7px', borderRadius: 4,
                background: '#0d2618', color: '#3ecf6e', border: '1px solid #1a4a2e',
              }}>pünktlich</span>
            )}
            <button
              onClick={e => { e.stopPropagation(); setShowTripPicker(true) }}
              style={{
                background: '#0d1f3c', border: '1px solid #1e3a6e',
                color: '#4f8ef7', borderRadius: 8, padding: '8px 14px',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#4f8ef7'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.borderColor = '#4f8ef7'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#0d1f3c'
                e.currentTarget.style.color = '#4f8ef7'
                e.currentTarget.style.borderColor = '#1e3a6e'
              }}
            >
              + Hinzufügen
            </button>
          </div>
        </div>

        {/* Route strip */}
        <RouteStrip legs={journey.legs} />
      </div>

      {/* Footer */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {uniqueOps.map(op => (
          <span key={op} style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 4,
            background: '#0d1f3c', color: '#8ba3c7', border: '1px solid #1e2d4a',
          }}>{op}</span>
        ))}
        <button style={{
          marginLeft: 'auto', fontSize: 11, color: '#4a6a9a',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          Alle Halte <ChevronDown size={10} />
        </button>
      </div>

      {/* Trip picker modal */}
      {showTripPicker && (
        <TripPickerModal
          onSelect={tripId => {
            setShowTripPicker(false)
            addLegMutation.mutate({ journey, tripId })
            router.push(`/trips/${tripId}`)
          }}
          onClose={() => setShowTripPicker(false)}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _queryClient = useQueryClient()

  const [from, setFrom] = useState<Station | null>(null)
  const [to, setTo] = useState<Station | null>(null)
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
  const [fromFocus, setFromFocus] = useState(false)
  const [toFocus, setToFocus] = useState(false)
  const debouncedFrom = useDebounce(fromQuery, 300)
  const debouncedTo = useDebounce(toQuery, 300)

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

  // Journey search
  const [searchParams, setSearchParams] = useState<{
    from: string; to: string; datetime: string; class: number
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
      const res = await fetch(`/api/search/connections?${p}`)
      if (res.status === 503) throw new Error('service_unavailable')
      if (!res.ok) throw new Error('fetch_failed')
      const data = await res.json()
      const results = data.data as Journey[]
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
    setSearchParams({ from: from.id, to: to.id, datetime, class: travelClass })
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

  function applyFilters(journeys: Journey[]): Journey[] {
    return journeys.filter(j => {
      if (filters.direct && j.changes > 0) return false
      if (filters.maxChanges2 && j.changes > 2) return false
      if (filters.onlyICE && !j.legs.some(l => (l.lineName ?? '').match(/^ICE|^IC |^EC /i))) return false
      return true
    }).sort((a, b) => {
      if (sortBy === 'duration') return a.totalDuration - b.totalDuration
      if (sortBy === 'changes') return a.changes - b.changes
      const aTime = new Date(a.legs[0]?.plannedDeparture ?? 0).getTime()
      const bTime = new Date(b.legs[0]?.plannedDeparture ?? 0).getTime()
      return aTime - bTime
    })
  }

  const filtered = journeys ? applyFilters(journeys) : []

  return (
    <div style={{ background: '#080d1a', minHeight: '100vh', padding: '28px 32px' }}>

      <div style={{ fontSize: 22, fontWeight: 500, color: '#fff', marginBottom: 4 }}>
        Verbindungssuche
      </div>
      <div style={{ fontSize: 13, color: '#4a6a9a', marginBottom: 20 }}>
        Zugverbindungen suchen und direkt zu deiner Reise hinzufügen
      </div>

      {/* ── Search card ── */}
      <div style={{
        background: '#0a1628', border: '1px solid #1e2d4a',
        borderRadius: 12, padding: '20px 24px', marginBottom: 20,
      }}>
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
                <circle cx="6" cy="6" r="4" stroke="#4f8ef7" strokeWidth="1.5" />
                <circle cx="6" cy="6" r="1.5" fill="#4f8ef7" />
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
              width: 34, height: 36, background: '#0d1f3c',
              border: '1px solid #1e3a6e', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ArrowLeftRight size={14} color="#4f8ef7" />
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
                <circle cx="6" cy="6" r="4" stroke="#4a6a9a" strokeWidth="1.5" />
              </svg>
            }
          />

          {/* Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontSize: 10, color: '#4a6a9a', textTransform: 'uppercase',
              letterSpacing: '1px', fontWeight: 500,
            }}>Datum</div>
            <div style={{
              background: '#080d1a', border: '1px solid #1e2d4a',
              borderRadius: 8, padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Calendar size={11} color="#4a6a9a" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 13, width: 110,
                }}
              />
            </div>
          </div>

          {/* Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontSize: 10, color: '#4a6a9a', textTransform: 'uppercase',
              letterSpacing: '1px', fontWeight: 500,
            }}>Zeit</div>
            <div style={{
              background: '#080d1a', border: '1px solid #1e2d4a',
              borderRadius: 8, padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Clock size={11} color="#4a6a9a" />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: '#fff', fontSize: 13, width: 70,
                }}
              />
            </div>
          </div>

          {/* Class */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontSize: 10, color: '#4a6a9a', textTransform: 'uppercase',
              letterSpacing: '1px', fontWeight: 500,
            }}>Klasse</div>
            <div style={{
              display: 'flex', background: '#080d1a',
              border: '1px solid #1e2d4a', borderRadius: 8, overflow: 'hidden',
            }}>
              {([2, 1] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setTravelClass(c)}
                  style={{
                    padding: '9px 14px', fontSize: 13, cursor: 'pointer', border: 'none',
                    background: travelClass === c ? '#0d1f3c' : 'none',
                    color: travelClass === c ? '#4f8ef7' : '#4a6a9a',
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
              background: from && to ? '#4f8ef7' : '#0d1f3c',
              color: from && to ? '#fff' : '#4a6a9a',
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
          borderTop: '1px solid #1e2d4a', paddingTop: 12,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#4a6a9a' }}>Schnellfilter:</span>
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
                  border: `1px solid ${filters[f.key] ? '#1e3a6e' : '#1e2d4a'}`,
                  background: filters[f.key] ? '#0d1f3c' : '#080d1a',
                  color: filters[f.key] ? '#4f8ef7' : '#4a6a9a',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Earlier / Later */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#4a6a9a' }}>Früher</span>
            <div style={{
              display: 'flex', background: '#080d1a',
              border: '1px solid #1e2d4a', borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => handleShift('earlier')}
                style={{
                  padding: '6px 12px', background: 'none', border: 'none',
                  color: '#4a6a9a', cursor: 'pointer', fontSize: 13,
                }}
              >◀</button>
              <button
                onClick={() => handleShift('later')}
                style={{
                  padding: '6px 12px', background: 'none', border: 'none',
                  color: '#4a6a9a', cursor: 'pointer', fontSize: 13,
                  borderLeft: '1px solid #1e2d4a',
                }}
              >▶</button>
            </div>
            <span style={{ fontSize: 11, color: '#4a6a9a' }}>Später</span>
          </div>
        </div>
      </div>

      {/* ── Recent searches ── */}
      {!searchParams && recentSearches.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, color: '#4a6a9a', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Zuletzt gesucht
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {recentSearches.map((r, i) => (
              <button
                key={i}
                onClick={() => { setFrom(r.from); setTo(r.to) }}
                style={{
                  background: '#0a1628', border: '1px solid #1e2d4a',
                  borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                  fontSize: 12, color: '#8ba3c7',
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
          <span style={{ fontSize: 13, color: '#4a6a9a' }}>
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
                  background: sortBy === s.key ? '#0d1f3c' : '#0a1628',
                  border: `1px solid ${sortBy === s.key ? '#1e3a6e' : '#1e2d4a'}`,
                  color: sortBy === s.key ? '#4f8ef7' : '#4a6a9a',
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
              style={{
                border: '1px solid #1e2d4a',
                borderRadius: 12, height: 140,
                background: 'linear-gradient(90deg,#0a1628 25%,#0d1f3c 50%,#0a1628 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div style={{
          background: '#1f0d0d', border: '1px solid #3a1515',
          borderRadius: 12, padding: '20px 24px', textAlign: 'center',
          color: '#e25555', fontSize: 14,
        }}>
          {(error as Error).message === 'service_unavailable'
            ? 'Verbindungssuche vorübergehend nicht verfügbar — bitte erneut versuchen'
            : 'Fehler bei der Suche — bitte erneut versuchen'}
        </div>
      )}

      {/* ── Results ── */}
      {journeys && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{
              background: '#0a1628', border: '1px solid #1e2d4a',
              borderRadius: 12, padding: '40px 24px', textAlign: 'center',
              color: '#4a6a9a', fontSize: 14,
            }}>
              Keine Verbindungen gefunden — Filter anpassen oder andere Zeit wählen
            </div>
          ) : (
            filtered.map((journey, i) => (
              <JourneyCard key={i} journey={journey} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
