'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Train, Clock, ArrowUp, ArrowDown,
         RefreshCw, AlertTriangle } from 'lucide-react'
import { TrainDetailSheet } from '@/components/trains/TrainDetailSheet'
import { OperatorBadge } from '@/components/ui/OperatorBadge'

type Tab = 'departures' | 'arrivals' | 'train'

interface Station {
  id: string
  name: string
}

interface Departure {
  tripId: string
  trainNumber: string
  operator: string | null
  direction: string
  plannedTime: string
  actualTime: string | null
  delay: number
  platform: string | null
  platformActual: string | null
  cancelled: boolean
  remarks: string[]
}

interface TrainResult {
  tripId: string
  trainNumber: string
  operator: string | null
  origin: string | null
  destination: string | null
  departure: string | null
  delay: number
}

export default function AbfahrtenPage() {
  const [tab, setTab] = useState<Tab>('departures')
  const [stationQuery, setStationQuery] = useState('')
  const [selectedStation, setSelectedStation] = useState<{
    id: string, name: string
  } | null>(null)
  const [trainQuery, setTrainQuery] = useState('')
  const [selectedTrain, setSelectedTrain] = useState<{ trainNumber: string; tripId?: string; date?: string } | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const debouncedStation = useDebounce(stationQuery, 300)
  const debouncedTrain   = useDebounce(trainQuery, 400)

  // Station autocomplete
  const { data: stationSuggestions } = useQuery({
    queryKey: ['stations', debouncedStation],
    queryFn: () => debouncedStation.length >= 2
      ? fetch(`/api/stations/search?q=${encodeURIComponent(debouncedStation)}`)
          .then(r => r.json()).then(d => d.data as Station[])
      : Promise.resolve([]),
    enabled: debouncedStation.length >= 2,
    staleTime: 1000 * 60 * 60,
  })

  // Departures/Arrivals
  const { data: departures, isLoading: depLoading, refetch: refetchDep } = useQuery({
    queryKey: ['departures', selectedStation?.id, tab],
    queryFn: () =>
      fetch(`/api/stations/${selectedStation!.id}/departures?type=${tab === 'arrivals' ? 'arr' : 'dep'}&duration=90`)
        .then(r => r.json()).then(d => d.data as Departure[]),
    enabled: !!selectedStation && tab !== 'train',
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  // Train search
  const { data: trainResults, isLoading: trainLoading } = useQuery({
    queryKey: ['train-search', debouncedTrain],
    queryFn: () =>
      fetch(`/api/trains/search?q=${encodeURIComponent(debouncedTrain)}`)
        .then(r => r.json()).then(d => d.data as TrainResult[]),
    enabled: debouncedTrain.length >= 3 && tab === 'train',
    staleTime: 1000 * 30,
  })

  return (
    <div style={{
      background: '#080d1a', minHeight: '100vh',
      padding: '20px 16px',
    }}>

      {/* Page title */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600,
                       color: '#fff', margin: 0 }}>
            Live Abfahrten
          </h1>
          <p style={{ fontSize: 13, color: '#4a6a9a', marginTop: 2 }}>
            Echtzeit-Abfahrten und Zugsuche
          </p>
        </div>
        {selectedStation && tab !== 'train' && (
          <button
            onClick={() => { refetchDep(); setLastRefresh(new Date()) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: '#4a6a9a',
              background: '#0d1f3c', border: '1px solid #1e3a6e',
              borderRadius: 7, padding: '7px 12px', cursor: 'pointer',
            }}
          >
            <RefreshCw size={12}/>
            {lastRefresh.toLocaleTimeString('de-DE',
              { hour: '2-digit', minute: '2-digit' })}
          </button>
        )}
      </div>

      {/* Tab selector */}
      <div style={{
        display: 'flex', background: '#0a1628',
        border: '1px solid #1e2d4a', borderRadius: 10,
        padding: 4, gap: 4, marginBottom: 16,
      }}>
        {([
          { key: 'departures', label: 'Abfahrten', icon: <ArrowUp size={13}/> },
          { key: 'arrivals',   label: 'Ankünfte',  icon: <ArrowDown size={13}/> },
          { key: 'train',      label: 'Zugnummer', icon: <Train size={13}/> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px 6px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 5,
            background: tab === t.key ? '#0d1f3c' : 'none',
            border: tab === t.key
              ? '1px solid #1e3a6e' : '1px solid transparent',
            borderRadius: 7, cursor: 'pointer',
            fontSize: 12, fontWeight: tab === t.key ? 500 : 400,
            color: tab === t.key ? '#4f8ef7' : '#4a6a9a',
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      {tab !== 'train' ? (
        /* Station search */
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#0a1628', border: '1px solid #1e2d4a',
            borderRadius: 9, padding: '11px 14px',
          }}>
            <Search size={14} color="#4a6a9a"/>
            <input
              value={selectedStation ? selectedStation.name : stationQuery}
              onChange={e => {
                setStationQuery(e.target.value)
                setSelectedStation(null)
              }}
              placeholder="Bahnhof suchen... (z.B. Frankfurt Hbf)"
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 14, flex: 1,
              }}
            />
            {selectedStation && (
              <button
                onClick={() => { setSelectedStation(null); setStationQuery('') }}
                style={{ background:'none',border:'none',
                         color:'#4a6a9a',cursor:'pointer',padding:0 }}>
                ✕
              </button>
            )}
          </div>

          {/* Station dropdown */}
          {stationSuggestions && stationSuggestions.length > 0 && !selectedStation && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              zIndex: 50, background: '#0a1628',
              border: '1px solid #1e2d4a', borderRadius: 9,
              marginTop: 4, overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {stationSuggestions.slice(0, 6).map(s => (
                <div key={s.id}
                  onClick={() => {
                    setSelectedStation(s)
                    setStationQuery('')
                  }}
                  style={{
                    padding: '11px 14px', cursor: 'pointer',
                    borderBottom: '1px solid #1e2d4a',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: '#fff',
                  }}
                >
                  <Train size={12} color="#4a6a9a"/>
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Train number search */
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#0a1628', border: '1px solid #1e2d4a',
            borderRadius: 9, padding: '11px 14px',
          }}>
            <Train size={14} color="#4a6a9a"/>
            <input
              value={trainQuery}
              onChange={e => setTrainQuery(e.target.value)}
              placeholder="Zugnummer eingeben... (z.B. ICE 521)"
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#fff', fontSize: 14, flex: 1,
              }}
            />
          </div>
        </div>
      )}

      {/* Empty state — no station selected */}
      {tab !== 'train' && !selectedStation && !stationQuery && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: '#4a6a9a',
        }}>
          <Train size={32} color="#1e2d4a" style={{ margin: '0 auto 12px' }}/>
          <div style={{ fontSize: 14 }}>
            Bahnhof eingeben um Abfahrten zu sehen
          </div>
          <div style={{ fontSize: 12, marginTop: 6, color: '#1e3a6e' }}>
            Echtzeit-Daten vom DB-Navigator
          </div>
        </div>
      )}

      {/* Departure/Arrival board */}
      {tab !== 'train' && selectedStation && (
        <div style={{
          background: '#0a1628', border: '1px solid #1e2d4a',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {/* Board header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid #1e2d4a',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
              {selectedStation.name}
            </div>
            <div style={{ fontSize: 11, color: '#4a6a9a' }}>
              Nächste 90 Min.
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 80px 1fr 52px',
            gap: 8, padding: '6px 14px',
            borderBottom: '1px solid #1e2d4a',
          }}>
            {['Zeit', 'Zug', 'Richtung', 'Gl.'].map(h => (
              <div key={h} style={{
                fontSize: 9, color: '#1e3a6e',
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {depLoading ? (
            Array.from({length: 8}).map((_, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: '1px solid #0d1628',
                display: 'grid',
                gridTemplateColumns: '48px 80px 1fr 52px',
                gap: 8,
              }}>
                {[40, 60, 140, 24].map((w, j) => (
                  <div key={j} style={{
                    height: 14, width: w,
                    background: '#0d1f3c', borderRadius: 3,
                    animation: 'pulse 1.5s infinite',
                  }}/>
                ))}
              </div>
            ))
          ) : (departures ?? []).map((dep, i: number) => {
            const delayMin = Math.round((dep.delay ?? 0) / 60)
            const platformChanged = dep.platformActual &&
              dep.platform && dep.platformActual !== dep.platform

            return (
              <div key={i}
                onClick={() => setSelectedTrain({ trainNumber: dep.trainNumber, tripId: dep.tripId, date: new Date(dep.plannedTime).toISOString().slice(0, 10) })}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 80px 1fr 52px',
                  gap: 8, padding: '11px 14px',
                  borderBottom: '1px solid #0d1628',
                  cursor: 'pointer', alignItems: 'center',
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.background = '#0d1628')}
                onMouseLeave={e =>
                  (e.currentTarget.style.background = 'transparent')}
              >
                {/* Time */}
                <div>
                  <div style={{
                    fontSize: 15, fontWeight: 600,
                    color: dep.cancelled ? '#e25555'
                      : delayMin > 0 ? '#e25555' : '#fff',
                    fontVariantNumeric: 'tabular-nums',
                    textDecoration: dep.cancelled ? 'line-through' : 'none',
                  }}>
                    {new Date(dep.plannedTime).toLocaleTimeString('de-DE',
                      { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {delayMin > 0 && !dep.cancelled && (
                    <div style={{ fontSize: 10, color: '#e25555' }}>
                      +{delayMin}
                    </div>
                  )}
                  {dep.cancelled && (
                    <div style={{ fontSize: 9, color: '#e25555' }}>
                      Ausfall
                    </div>
                  )}
                </div>

                {/* Train badge */}
                <div>
                  <OperatorBadge
                    operator={dep.operator}
                    lineName={dep.trainNumber}
                    small
                  />
                </div>

                {/* Direction + remarks */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: dep.cancelled ? '#4a6a9a' : '#fff',
                    whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textDecoration: dep.cancelled ? 'line-through' : 'none',
                  }}>
                    {dep.direction}
                  </div>
                  {dep.remarks?.[0] && (
                    <div style={{
                      fontSize: 10, color: '#f59e0b', marginTop: 1,
                      whiteSpace: 'nowrap', overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      ⚠ {dep.remarks[0]}
                    </div>
                  )}
                </div>

                {/* Platform */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 12,
                    color: platformChanged ? '#f59e0b'
                      : dep.platform ? '#8ba3c7' : '#1e3a6e',
                  }}>
                    {dep.platformActual ?? dep.platform ?? '–'}
                  </div>
                  {platformChanged && (
                    <div style={{
                      fontSize: 9, color: '#4a6a9a',
                      textDecoration: 'line-through',
                    }}>
                      {dep.platform}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Train number search results */}
      {tab === 'train' && (
        <div>
          {trainLoading && (
            <div style={{ textAlign: 'center', padding: 40,
                          color: '#4a6a9a', fontSize: 13 }}>
              Suche...
            </div>
          )}
          {trainResults?.map((t, i: number) => (
            <div key={i}
              onClick={() => setSelectedTrain({ trainNumber: t.trainNumber, tripId: t.tripId })}
              style={{
                background: '#0a1628', border: '1px solid #1e2d4a',
                borderRadius: 10, padding: '14px',
                marginBottom: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <OperatorBadge operator={t.operator} lineName={t.trainNumber}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>
                  {t.origin} → {t.destination}
                </div>
                <div style={{ fontSize: 11, color: '#4a6a9a', marginTop: 2 }}>
                  Ab {t.departure ? new Date(t.departure).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {t.delay > 0 && (
                    <span style={{ color: '#e25555', marginLeft: 6 }}>
                      +{Math.round(t.delay/60)} Min.
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#4f8ef7' }}>
                Details →
              </div>
            </div>
          ))}
          {trainQuery.length >= 3 && !trainLoading &&
           trainResults?.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40,
                          color: '#4a6a9a', fontSize: 13 }}>
              Kein Zug gefunden für "{trainQuery}"
            </div>
          )}
          {trainQuery.length < 3 && (
            <div style={{ textAlign: 'center', padding: '60px 20px',
                          color: '#4a6a9a' }}>
              <Train size={32} color="#1e2d4a"
                     style={{ margin: '0 auto 12px' }}/>
              <div style={{ fontSize: 14 }}>
                Zugnummer eingeben
              </div>
              <div style={{ fontSize: 12, marginTop: 6,
                            color: '#1e3a6e' }}>
                z.B. ICE 521, RJ 68, TGV 9576
              </div>
            </div>
          )}
        </div>
      )}

      {/* Train detail sheet */}
      {selectedTrain && (
        <TrainDetailSheet
          trainNumber={selectedTrain.trainNumber}
          tripId={selectedTrain.tripId}
          date={selectedTrain.date}
          onClose={() => setSelectedTrain(null)}
        />
      )}
    </div>
  )
}

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}