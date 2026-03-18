'use client'

import { useQuery } from '@tanstack/react-query'
import { X, Train, Wifi, UtensilsCrossed, Bike,
         Zap, Clock, AlertTriangle } from 'lucide-react'
import { OperatorBadge } from '@/components/ui/OperatorBadge'

interface Stop {
  stationName: string
  stationId: string | null
  arrival: string | null
  arrivalDelay: number
  departure: string | null
  departureDelay: number
  platform: string | null
  platformActual: string | null
  cancelled: boolean
  passed: boolean
}

interface TrainDetail {
  tripId: string
  trainNumber: string
  lineName: string
  operator: string | null
  direction: string | null
  origin: string | null
  destination: string | null
  stops: Stop[]
  currentStopIdx: number
  cancelled: boolean
  rollingStock: any | null
}

interface TrainDetailSheetProps {
  trainNumber: string
  tripId?: string
  date?: string
  highlightStopId?: string
  onClose: () => void
  onAddToTrip?: (stop: Stop) => void
}

export function TrainDetailSheet({
  trainNumber, tripId, date, highlightStopId, onClose, onAddToTrip
}: TrainDetailSheetProps) {

  const { data, isLoading, isError } = useQuery({
    queryKey: ['train', trainNumber, tripId, date],
    queryFn: () => {
      const params = new URLSearchParams()
      if (tripId) params.set('tripId', tripId)
      params.set('date', date ?? new Date().toISOString().slice(0, 10))
      return fetch(`/api/trains/${encodeURIComponent(trainNumber)}?${params}`, {
        signal: AbortSignal.timeout(15000),
      })
        .then(r => r.json()).then(d => d.data)
    },
    refetchInterval: 60_000,
    retry: 1,
    retryDelay: 2000,
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        // Mobile: bottom sheet
        bottom: 0, left: 0, right: 0,
        // Desktop: right panel
        // Use CSS classes for responsive:
        zIndex: 101,
        background: '#0a1628',
        border: '1px solid #1e2d4a',
        borderRadius: '14px 14px 0 0',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="train-detail-sheet"
      >

        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid #1e2d4a',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            width: 28, height: 28, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: '#0d1f3c', border: '1px solid #1e3a6e',
            borderRadius: 6, cursor: 'pointer', flexShrink: 0,
          }}>
            <X size={14} color="#4f8ef7" />
          </button>

          {data && (
            <>
              <OperatorBadge operator={data.operator} lineName={data.lineName} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500,
                              color: '#fff', lineHeight: 1.2 }}>
                  {data.origin} → {data.destination}
                </div>
                <div style={{ fontSize: 11, color: '#4a6a9a',
                              marginTop: 1 }}>
                  {data.operator} · {data.lineName}
                </div>
              </div>
              {data.cancelled && (
                <span style={{
                  marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 4,
                  background: '#1f0d0d', color: '#e25555',
                  border: '1px solid #3a1515', flexShrink: 0,
                }}>
                  AUSGEFALLEN
                </span>
              )}
            </>
          )}
        </div>

        {/* Progress bar */}
        {data && !data.cancelled && data.currentStopIdx >= 0 && (
          <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#4a6a9a',
                          textTransform: 'uppercase', letterSpacing: 1,
                          marginBottom: 8 }}>
              Aktuelle Position
            </div>
            <ProgressBar
              stops={data.stops}
              currentIdx={data.currentStopIdx}
            />
          </div>
        )}

        {/* Feature chips */}
        {data?.rollingStock && (
          <div style={{
            display: 'flex', gap: 6, padding: '8px 16px',
            flexWrap: 'wrap', flexShrink: 0,
            borderBottom: '1px solid #1e2d4a',
          }}>
            {data.rollingStock.has_wifi && (
              <Chip icon={<Wifi size={11}/>} label="WLAN" />
            )}
            {data.rollingStock.has_power && (
              <Chip icon={<Zap size={11}/>} label="Steckdose" />
            )}
            {data.rollingStock.has_bistro && (
              <Chip icon={<UtensilsCrossed size={11}/>} label="Bordrestaurant" />
            )}
            {data.rollingStock.has_bike && (
              <Chip icon={<Bike size={11}/>} label="Fahrrad" />
            )}
          </div>
        )}

        {/* Stop list */}
        <div style={{ flex: 1, overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch' }}>
          {isLoading && <LoadingStops />}
          {isError && <ErrorState />}
          {data?.stops.map((stop: Stop, i: number) => (
            <StopRow
              key={i}
              stop={stop}
              isFirst={i === 0}
              isLast={i === data.stops.length - 1}
              isCurrent={i === data.currentStopIdx}
              isPassed={stop.passed}
              isHighlighted={stop.stationId === highlightStopId}
              onAddToTrip={onAddToTrip ? () => onAddToTrip(stop) : undefined}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function ProgressBar({ stops, currentIdx }: {
  stops: Stop[], currentIdx: number
}) {
  const pct = Math.round((currentIdx / (stops.length - 1)) * 100)
  return (
    <div>
      <div style={{
        height: 4, background: '#1e2d4a',
        borderRadius: 2, position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${pct}%`, background: '#4f8ef7', borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', left: `${pct}%`,
          top: '50%', transform: 'translate(-50%,-50%)',
          width: 12, height: 12, borderRadius: '50%',
          background: '#3ecf6e', border: '2px solid #080d1a',
          boxShadow: '0 0 0 3px rgba(62,207,110,0.2)',
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 5,
      }}>
        <span style={{ fontSize: 9, color: '#4a6a9a' }}>
          {stops[0]?.stationName}
        </span>
        <span style={{ fontSize: 9, color: '#3ecf6e' }}>
          ● {stops[currentIdx]?.stationName}
        </span>
        <span style={{ fontSize: 9, color: '#4a6a9a' }}>
          {stops[stops.length-1]?.stationName}
        </span>
      </div>
    </div>
  )
}

function StopRow({ stop, isFirst, isLast, isCurrent,
                  isPassed, isHighlighted, onAddToTrip }: {
  stop: Stop
  isFirst: boolean
  isLast: boolean
  isCurrent: boolean
  isPassed: boolean
  isHighlighted: boolean
  onAddToTrip?: () => void
}) {
  const platformChanged = stop.platformActual &&
    stop.platform && stop.platformActual !== stop.platform

  const depTime = stop.departure
    ? new Date(stop.departure).toLocaleTimeString('de-DE',
        { hour: '2-digit', minute: '2-digit' })
    : null
  const totalDelay = (stop.departureDelay ?? 0) + (stop.arrivalDelay ?? 0)
  const delayMin = Math.round(totalDelay / 60)

  return (
    <div style={{
      display: 'flex', gap: 10,
      padding: '0 16px 0 12px',
      position: 'relative',
      background: isHighlighted ? 'rgba(79,142,247,0.05)' : 'transparent',
    }}>
      {/* Vertical line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 22,
          top: isFirst ? '50%' : 0,
          bottom: isLast ? '50%' : 0,
          width: 2,
          background: isPassed ? '#4f8ef7' : '#1e2d4a',
          zIndex: 0,
        }} />
      )}

      {/* Dot */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '10px 0',
        display: 'flex', alignItems: 'center',
        flexShrink: 0, width: 24, justifyContent: 'center',
      }}>
        <div style={{
          width:  isCurrent||isFirst||isLast ? 12 : 9,
          height: isCurrent||isFirst||isLast ? 12 : 9,
          borderRadius: '50%',
          background: isCurrent ? '#3ecf6e'
            : isPassed ? '#4f8ef7'
            : isFirst || isLast ? '#fff'
            : '#080d1a',
          border: `2px solid ${
            isCurrent ? '#3ecf6e'
            : isPassed ? '#4f8ef7'
            : isFirst || isLast ? '#fff'
            : '#4a6a9a'
          }`,
          boxShadow: isCurrent
            ? '0 0 0 3px rgba(62,207,110,0.2)' : 'none',
        }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1, padding: '8px 0',
        borderBottom: isLast ? 'none' : '1px solid #0d1628',
        minWidth: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {depTime && (
              <span style={{
                fontSize: 14, fontWeight: 500,
                color: isPassed ? '#4a6a9a' : '#fff',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {depTime}
              </span>
            )}
            {stop.cancelled ? (
              <span style={{ fontSize: 10, padding: '1px 5px',
                borderRadius: 3, background: '#1f0d0d', color: '#e25555' }}>
                Ausfall
              </span>
            ) : delayMin > 0 ? (
              <span style={{ fontSize: 10, padding: '1px 5px',
                borderRadius: 3, background: '#1f0d0d', color: '#e25555' }}>
                +{delayMin} Min.
              </span>
            ) : isPassed ? null : (
              <span style={{ fontSize: 10, padding: '1px 5px',
                borderRadius: 3, background: '#0d2618', color: '#3ecf6e' }}>
                pünktl.
              </span>
            )}
          </div>
          {/* Platform */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {stop.platform && (
              <div style={{
                fontSize: 10,
                color: platformChanged ? '#f59e0b' : '#4a6a9a',
              }}>
                Gl. {stop.platformActual ?? stop.platform}
                {platformChanged && (
                  <span style={{ textDecoration: 'line-through',
                    color: '#4a6a9a', marginLeft: 3 }}>
                    {stop.platform}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{
          fontSize: 12, marginTop: 1,
          color: isCurrent ? '#fff'
            : isPassed ? '#4a6a9a' : '#8ba3c7',
          fontWeight: isCurrent ? 500 : 400,
        }}>
          {stop.stationName}
        </div>

        {isCurrent && (
          <div style={{ fontSize: 9, color: '#3ecf6e',
            textTransform: 'uppercase', letterSpacing: 1,
            marginTop: 2 }}>
            ● Zug befindet sich hier
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: '#4a6a9a',
      background: '#0d1f3c', border: '1px solid #1e2d4a',
      borderRadius: 5, padding: '4px 8px',
    }}>
      {icon}{label}
    </div>
  )
}

function LoadingStops() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#4a6a9a' }}>
        Lade Zugdaten...
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: '#e25555' }}>
        Fehler beim Laden der Zugdaten
      </div>
    </div>
  )
}