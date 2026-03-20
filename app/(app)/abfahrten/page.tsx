'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { SlidersHorizontal } from 'lucide-react'

// Station presets for quick selection
const PRESET_STATIONS = [
  { id: '8000105', name: 'Frankfurt Hbf' },
  { id: '8000261', name: 'München Hbf' },
  { id: '8003368', name: 'Köln Hbf' },
  { id: '8011160', name: 'Berlin Hbf' },
  { id: '8000044', name: 'Bonn Hbf' },
  { id: '8000191', name: 'Hamburg Hbf' },
]

export default function AbfahrtenPage() {
  const [selectedStation, setSelectedStation] = useState(PRESET_STATIONS[0])
  const [stationQuery, setStationQuery]       = useState('')
  const [showDropdown, setShowDropdown]       = useState(false)
  const [searchQuery, setSearchQuery]         = useState('')  // filter by train/dest
  const [tab, setTab]                         = useState<'dep'|'arr'>('dep')
  const [lastUpdated, setLastUpdated]         = useState(new Date())

  const debouncedStation = useDebounce(stationQuery, 300)

  // Station autocomplete
  const { data: stationSuggestions } = useQuery({
    queryKey: ['stations', debouncedStation],
    queryFn: () =>
      fetch(`/api/stations/search?q=${encodeURIComponent(debouncedStation)}`)
        .then(r => r.json()).then(d => d.data ?? []),
    enabled: debouncedStation.length >= 2,
    staleTime: 1000 * 60 * 60,
  })

  // Departures
  const { data: departures, isLoading, refetch } = useQuery({
    queryKey: ['departures', selectedStation.id, tab],
    queryFn: async () => {
      const res = await fetch(
        `/api/stations/${selectedStation.id}/departures?type=${tab}&duration=90`
      )
      const json = await res.json()
      setLastUpdated(new Date())
      return json.data ?? []
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  // Filter by search query
  const filtered = (departures ?? []).filter((d: any) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (d.trainNumber ?? '').toLowerCase().includes(q) ||
      (d.direction ?? '').toLowerCase().includes(q)
    )
  })

  // Format time HH:MM
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit'
    })

  // Delay in minutes
  const delayMin = (dep: any) => Math.round((dep.delay ?? 0) / 60)

  // Operator color for train badge
  const trainColor = (name: string) => {
    const n = name.toUpperCase()
    if (n.startsWith('ICE') || n.startsWith('IC') || n.startsWith('EC'))
      return 'text-white'
    if (n.startsWith('RE') || n.startsWith('RB'))
      return 'text-white'
    if (n.startsWith('S'))
      return 'text-white'
    return 'text-white'
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-station-picker]')) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(var(--background))',
      padding: '32px 24px',
      fontFamily: 'inherit',
    }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'hsl(var(--foreground))',
            letterSpacing: '-0.3px',
            margin: 0,
          }}>
            Live Abfahrten
          </h1>
          {/* Live green dot */}
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: 'hsl(var(--success, 152 60% 45%))',
            boxShadow: '0 0 0 3px hsl(152 60% 45% / 0.2)',
            animation: 'pulse 2s infinite',
          }} />
        </div>

        {/* Connection count */}
        {!isLoading && departures && (
          <span style={{
            fontSize: 13,
            color: 'hsl(var(--muted-foreground))',
          }}>
            {filtered.length} Verbindungen
          </span>
        )}
      </div>

      {/* ── Controls row ───────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 24,
        alignItems: 'center',
      }}>

        {/* Station selector */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 38,
            padding: '0 12px',
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            cursor: 'pointer',
            minWidth: 160,
          }}
          data-station-picker
          onClick={() => {
            setShowDropdown(!showDropdown)
            setStationQuery('')
          }}>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'hsl(var(--foreground))',
              flex: 1,
            }}>
              {selectedStation.name}
            </span>
            {/* Filter icon */}
            <SlidersHorizontal
              size={13}
              color="hsl(var(--muted-foreground))"
            />
          </div>

          {/* Station dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 50,
              marginTop: 4,
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              minWidth: 240,
            }}>
              {/* Search input inside dropdown */}
              <div style={{ padding: '8px 10px',
                            borderBottom: '1px solid hsl(var(--border))' }}>
                <input
                  autoFocus
                  value={stationQuery}
                  onChange={e => setStationQuery(e.target.value)}
                  placeholder="Bahnhof suchen..."
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </div>

              {/* Suggestions or presets */}
              {(stationSuggestions?.length > 0 ? stationSuggestions : PRESET_STATIONS)
                .slice(0, 8)
                .map((s: any) => (
                  <div key={s.id}
                    onClick={() => {
                      setSelectedStation(s)
                      setShowDropdown(false)
                    }}
                    style={{
                      padding: '10px 14px',
                      fontSize: 13,
                      color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                      borderBottom: '1px solid hsl(var(--border) / 0.5)',
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.background =
                        'hsl(var(--muted))')}
                    onMouseLeave={e =>
                      (e.currentTarget.style.background = 'transparent')}
                  >
                    {s.name}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Search box — train number or destination */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 38,
          padding: '0 14px',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5"
              stroke="hsl(var(--muted-foreground))" strokeWidth="1.4"/>
            <line x1="9.5" y1="9.5" x2="12.5" y2="12.5"
              stroke="hsl(var(--muted-foreground))" strokeWidth="1.4"
              strokeLinecap="round"/>
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Zugnummer oder Ziel suchen..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'hsl(var(--foreground))',
            }}
          />
        </div>

        {/* Dep / Arr toggle */}
        <div style={{
          display: 'flex',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 8,
          overflow: 'hidden',
          height: 38,
          flexShrink: 0,
        }}>
          {[
            { key: 'dep', label: 'Abfahrt' },
            { key: 'arr', label: 'Ankunft' },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key as 'dep'|'arr')}
              style={{
                padding: '0 16px',
                fontSize: 12,
                fontWeight: tab === t.key ? 500 : 400,
                background: tab === t.key
                  ? 'hsl(var(--secondary))' : 'transparent',
                color: tab === t.key
                  ? 'hsl(var(--foreground))'
                  : 'hsl(var(--muted-foreground))',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        overflow: 'hidden',
      }}>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 130px 1fr 100px 120px',
          padding: '8px 16px',
          borderBottom: '1px solid hsl(var(--border))',
        }}>
          {['ZEIT', 'ZUG', 'ZIEL', 'GLEIS', 'STATUS'].map(h => (
            <span key={h} style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'hsl(var(--muted-foreground))',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '90px 130px 1fr 100px 120px',
            padding: '14px 16px',
            borderBottom: '1px solid hsl(var(--border) / 0.5)',
            gap: 8,
          }}>
            {[60, 80, 160, 50, 70].map((w, j) => (
              <div key={j} style={{
                height: 14, width: w,
                background: 'hsl(var(--muted))',
                borderRadius: 3,
                opacity: 1 - i * 0.08,
              }}/>
            ))}
          </div>
        ))}

        {/* Rows */}
        {!isLoading && filtered.map((dep: any, i: number) => {
          const delay    = delayMin(dep)
          const isLate   = delay > 0
          const isCancelled = dep.cancelled
          const platformChanged = dep.platformActual &&
            dep.platform && dep.platformActual !== dep.platform
          const plannedTime = fmt(dep.plannedTime)
          const isLast   = i === filtered.length - 1

          return (
            <div
              key={i}
              onClick={() => {/* open TrainDetailSheet */}}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 130px 1fr 100px 120px',
                padding: '13px 16px',
                borderBottom: isLast
                  ? 'none'
                  : '1px solid hsl(var(--border) / 0.5)',
                cursor: 'pointer',
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.background =
                  'hsl(var(--muted) / 0.5)')}
              onMouseLeave={e =>
                (e.currentTarget.style.background = 'transparent')}
            >

              {/* ZEIT */}
              <span style={{
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                fontSize: 14,
                fontWeight: 500,
                color: isCancelled
                  ? 'hsl(var(--destructive))'
                  : 'hsl(var(--foreground))',
                textDecoration: isCancelled ? 'line-through' : 'none',
              }}>
                {plannedTime}
              </span>

              {/* ZUG */}
              <span style={{
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                fontSize: 13,
                color: isCancelled
                  ? 'hsl(var(--muted-foreground))'
                  : 'hsl(var(--foreground))',
                textDecoration: isCancelled ? 'line-through' : 'none',
              }}>
                {dep.trainNumber}
              </span>

              {/* ZIEL */}
              <span style={{
                fontSize: 13,
                color: isCancelled
                  ? 'hsl(var(--muted-foreground))'
                  : 'hsl(var(--foreground))',
                textDecoration: isCancelled ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                paddingRight: 16,
              }}>
                {dep.direction}
              </span>

              {/* GLEIS */}
              <span style={{
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                fontSize: 13,
                color: platformChanged
                  ? 'hsl(var(--warning, 38 92% 50%))'
                  : 'hsl(var(--muted-foreground))',
              }}>
                {dep.platformActual ?? dep.platform
                  ? `Gl. ${dep.platformActual ?? dep.platform}`
                  : '–'}
              </span>

              {/* STATUS */}
              {isCancelled ? (
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: 'hsl(var(--destructive))',
                }}>
                  Ausfall
                </span>
              ) : isLate ? (
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: 'hsl(var(--destructive))',
                }}>
                  +{delay} Min
                </span>
              ) : (
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: 'hsl(var(--success, 152 60% 45%))',
                }}>
                  Pünktlich
                </span>
              )}
            </div>
          )
        })}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div style={{
            padding: '60px 24px',
            textAlign: 'center',
            color: 'hsl(var(--muted-foreground))',
            fontSize: 13,
          }}>
            {searchQuery
              ? `Keine Ergebnisse für "${searchQuery}"`
              : 'Keine Abfahrten gefunden'}
          </div>
        )}
      </div>

      {/* Last updated */}
      <p style={{
        marginTop: 10,
        fontSize: 11,
        color: 'hsl(var(--muted-foreground))',
        textAlign: 'right',
      }}>
        Aktualisiert: {lastUpdated.toLocaleTimeString('de-DE',
          { hour: '2-digit', minute: '2-digit' })}
        {' · '}
        <button
          onClick={() => refetch()}
          style={{
            background: 'none', border: 'none',
            color: 'hsl(var(--primary))',
            cursor: 'pointer', fontSize: 11,
          }}>
          Aktualisieren
        </button>
      </p>

      {/* Pulse animation for live dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}