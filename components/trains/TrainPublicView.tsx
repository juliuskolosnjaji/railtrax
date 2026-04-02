'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { TrainRouteMap } from '@/components/map/TrainRouteMap'

interface Props {
  trainNumber: string
  tripId?: string
  date?: string
}

interface TripRemark {
  type: 'warning' | 'hint'
  text: string
}

interface TripStopover {
  name: string
  id: string | null
  lat: number | null
  lon: number | null
  plannedDeparture: string | null
  actualDeparture: string | null
  plannedArrival: string | null
  actualArrival: string | null
  departureDelay: number
  arrivalDelay: number
  platform: string | null
  platformActual: string | null
  cancelled: boolean
  isPassed: boolean
}

interface TripPublicData {
  tripId: string
  lineName: string | null
  operator: string | null
  direction: string | null
  origin: string | null
  destination: string | null
  cancelled: boolean
  currentIdx: number
  stopovers: TripStopover[]
  remarks: TripRemark[]
}

function fmtTime(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '–'
}

function delayMin(seconds: number | null | undefined) {
  return Math.round((seconds ?? 0) / 60)
}

function getQueryUrl(trainNumber: string, tripId?: string, date?: string) {
  if (tripId) {
    return `/api/trains/trip?tripId=${encodeURIComponent(tripId)}&lineName=${encodeURIComponent(trainNumber)}`
  }

  return `/api/trains/trip?lineName=${encodeURIComponent(trainNumber)}&date=${date ?? new Date().toISOString().slice(0, 10)}`
}

export function TrainPublicView({ trainNumber, tripId, date }: Props) {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery<TripPublicData>({
    queryKey: ['train-public', tripId ?? trainNumber, date],
    queryFn: async () => {
      const response = await fetch(getQueryUrl(trainNumber, tripId, date))
      const json = await response.json()
      return json.data
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const stopovers = data?.stopovers ?? []
  const currentIdx = data?.currentIdx ?? 0
  const origin = stopovers[0] ?? null
  const dest = stopovers[stopovers.length - 1] ?? null
  const nextStop = stopovers.slice(currentIdx + 1).find(stop => !stop.cancelled) ?? null
  const arrivalDelay = dest ? delayMin(dest.arrivalDelay) : 0
  const minsToNext = nextStop?.plannedDeparture
    ? Math.max(0, Math.round((new Date(nextStop.plannedDeparture).getTime() - Date.now()) / 60_000))
    : null
  const remainingStops = Math.max(0, stopovers.length - currentIdx - 1)
  const progressPct = stopovers.length > 1
    ? Math.round((currentIdx / (stopovers.length - 1)) * 100)
    : 0

  return (
    <>
      <div
        style={{
          width: 400,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1a2030',
          background: '#080c12',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 22px 14px',
            borderBottom: '1px solid #1a2030',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 14,
              marginBottom: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: '#f0f4f8',
                  letterSpacing: '-0.8px',
                  fontFamily: '"JetBrains Mono", monospace',
                  lineHeight: 1,
                }}
              >
                {data?.lineName ?? trainNumber.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: '#8ba3c7', marginTop: 6 }}>
                Richtung {data?.direction ?? dest?.name ?? '…'}
              </div>
              <div style={{ fontSize: 11, color: '#3a4a5a', marginTop: 1 }}>
                {data?.operator ?? ''}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 5,
                flexShrink: 0,
              }}
            >
              {data?.cancelled ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: '#1f0a0a',
                    border: '0.5px solid #E24B4A',
                    color: '#E24B4A',
                  }}
                >
                  Ausfall
                </span>
              ) : arrivalDelay > 0 ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: '#1f0a0a',
                    border: '0.5px solid #E24B4A',
                    color: '#E24B4A',
                  }}
                >
                  +{arrivalDelay} Min
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: '#061a10',
                    border: '0.5px solid #2dd4b0',
                    color: '#2dd4b0',
                  }}
                >
                  Pünktlich
                </span>
              )}

              <span
                style={{
                  fontSize: 10,
                  color: '#3a4a5a',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '0.5px solid #1a2030',
                }}
              >
                {stopovers.length} Halte
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#3a4a5a', marginRight: 'auto' }}>
              Stand:{' '}
              {dataUpdatedAt
                ? new Date(dataUpdatedAt).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '–'}{' '}
              Uhr
            </span>
            <button
              onClick={() => refetch()}
              style={{
                height: 28,
                padding: '0 10px',
                borderRadius: 6,
                border: '0.5px solid #1a2030',
                background: 'none',
                fontSize: 11,
                color: '#4a5568',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RefreshCw size={10} />
              Aktualisieren
            </button>
          </div>
        </div>

        <div
          style={{
            padding: '12px 22px',
            borderBottom: '1px solid #1a2030',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: 2,
              background: '#1a2030',
              borderRadius: 1,
              position: 'relative',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progressPct}%`,
                background: '#2dd4b0',
                borderRadius: 1,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${progressPct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#2dd4b0',
                border: '1.5px solid #080c12',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              fontSize: 9,
              color: '#3a4a5a',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {origin?.name ?? '–'}
            </span>
            <span
              style={{
                color: '#2dd4b0',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              ● {stopovers[currentIdx]?.name ?? '–'}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dest?.name ?? '–'}
            </span>
          </div>
        </div>

        {(data?.remarks.length ?? 0) > 0 && (
          <div
            style={{
              padding: '8px 14px',
              borderBottom: '1px solid #1a2030',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                borderRadius: 7,
                border: '0.5px solid rgba(239,159,39,.18)',
                background: 'rgba(239,159,39,.04)',
                overflow: 'hidden',
              }}
            >
              {data?.remarks.map((remark, index) => (
                <div
                  key={`${remark.type}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderBottom: index < data.remarks.length - 1
                      ? '0.5px solid rgba(239,159,39,.08)'
                      : 'none',
                  }}
                >
                  <AlertTriangle size={11} color="#c4820a" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#c4820a' }}>{remark.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '50px 1fr 44px',
            gap: 6,
            padding: '7px 22px 5px',
            borderBottom: '1px solid #1a2030',
            flexShrink: 0,
          }}
        >
          {['Zeit', 'Halt', 'Gl.'].map((header, index) => (
            <span
              key={header}
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: '#2a3545',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                textAlign: index === 2 ? 'right' : 'left',
              }}
            >
              {header}
            </span>
          ))}
        </div>

        <div
          className="stop-list-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {isLoading && Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr 44px',
                gap: 6,
                padding: '8px 22px',
                borderBottom: '1px solid #0d1320',
              }}
            >
              {[40, 120, 24].map((width, skeletonIndex) => (
                <div
                  key={skeletonIndex}
                  style={{
                    height: 13,
                    width,
                    background: '#1a2030',
                    borderRadius: 3,
                    opacity: 1 - index * 0.08,
                  }}
                />
              ))}
            </div>
          ))}

          {!isLoading && !isError && stopovers.map((stop, index) => {
            const isPassed = stop.isPassed
            const isCurrent = index === currentIdx
            const isLast = index === stopovers.length - 1
            const delay = delayMin(stop.departureDelay ?? stop.arrivalDelay)
            const platformChanged = !!(
              stop.platformActual &&
              stop.platform &&
              stop.platformActual !== stop.platform
            )
            const showTime = stop.plannedDeparture ?? stop.plannedArrival

            return (
              <div
                key={`${stop.id ?? stop.name}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 44px',
                  gap: 6,
                  padding: isCurrent ? '8px 22px 8px 20px' : '8px 22px',
                  borderBottom: isLast ? 'none' : '1px solid #0d1320',
                  borderLeft: isCurrent ? '2px solid #2dd4b0' : 'none',
                  background: isCurrent ? 'rgba(45,212,176,.05)' : 'transparent',
                  opacity: isPassed && !isCurrent ? 0.38 : 1,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontVariantNumeric: 'tabular-nums',
                      color: stop.cancelled ? '#E24B4A' : '#c8d4e0',
                      fontWeight: isLast ? 600 : 500,
                      lineHeight: 1.2,
                      textDecoration: stop.cancelled ? 'line-through' : 'none',
                    }}
                  >
                    {fmtTime(showTime)}
                  </div>
                  {delay > 0 && !stop.cancelled && (
                    <div style={{ fontSize: 9, color: '#E24B4A', marginTop: 1 }}>
                      +{delay}
                    </div>
                  )}
                  {stop.cancelled && (
                    <div style={{ fontSize: 9, color: '#E24B4A', marginTop: 1 }}>
                      Ausfall
                    </div>
                  )}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isCurrent ? '#f0f4f8' : isPassed ? '#2a3545' : '#c8d4e0',
                      fontWeight: isCurrent || isLast ? 500 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stop.name}
                  </div>
                  {isCurrent && (
                    <div
                      style={{
                        fontSize: 9,
                        color: '#2dd4b0',
                        fontWeight: 500,
                        marginTop: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: '#2dd4b0',
                          flexShrink: 0,
                        }}
                      />
                      Zug befindet sich hier
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: platformChanged ? '#EF9F27' : '#3a4a5a',
                  }}
                >
                  {platformChanged ? `${stop.platformActual} ↑` : (stop.platform ?? '–')}
                </div>
              </div>
            )
          })}

          {!isLoading && (isError || !data) && (
            <div style={{ padding: '24px 22px', color: '#8ba3c7', fontSize: 13 }}>
              Zugdaten nicht verfügbar.
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', background: '#0d1520', overflow: 'hidden' }}>
        {stopovers.filter(stop => stop.lat != null && stop.lon != null).length >= 2 ? (
          <TrainRouteMap stopovers={stopovers} currentIdx={currentIdx} height="100%" />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4a5568',
              fontSize: 14,
            }}
          >
            Karte nicht verfügbar.
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            zIndex: 10,
            display: 'flex',
            gap: 5,
            flexWrap: 'wrap',
            maxWidth: 'calc(100% - 28px)',
            pointerEvents: 'none',
          }}
        >
          {[
            { label: '● Live', teal: true },
            { label: data?.lineName ?? trainNumber.toUpperCase() },
            { label: origin && dest ? `${origin.name} → ${dest.name}` : '' },
            { label: data?.operator ?? '' },
          ].filter(chip => chip.label).map(({ label, teal }) => (
            <div
              key={label}
              style={{
                background: 'rgba(8,12,18,.82)',
                border: `0.5px solid ${teal ? 'rgba(45,212,176,.25)' : '#1a2030'}`,
                borderRadius: 5,
                padding: '3px 9px',
                fontSize: 10,
                color: teal ? '#2dd4b0' : '#8ba3c7',
                backdropFilter: 'blur(6px)',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            zIndex: 10,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            maxWidth: 'calc(100% - 92px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 0,
              background: 'rgba(8,12,18,.88)',
              border: '0.5px solid #1a2030',
              borderRadius: 10,
              overflow: 'hidden',
              backdropFilter: 'blur(8px)',
            }}
          >
            {[
              {
                label: 'Verspätung',
                value: data?.cancelled ? 'Ausfall' : arrivalDelay > 0 ? `+${arrivalDelay} Min` : 'Pünktlich',
                valueColor: data?.cancelled ? '#E24B4A' : arrivalDelay > 0 ? '#E24B4A' : '#2dd4b0',
                sub: null,
                subColor: undefined,
                valueFontSize: undefined,
              },
              {
                label: `Ankunft ${dest?.name?.split(' ')[0] ?? 'Ziel'}`,
                value: fmtTime(dest?.plannedArrival ?? null),
                valueColor: '#f0f4f8',
                sub: arrivalDelay > 0 ? `planm. ${fmtTime(dest?.plannedArrival ?? null)}` : null,
                subColor: undefined,
                valueFontSize: undefined,
              },
              {
                label: 'Nächster Halt',
                value: nextStop?.name ?? '–',
                valueColor: '#f0f4f8',
                valueFontSize: 13,
                sub: minsToNext !== null
                  ? `in ~${minsToNext} Min${(nextStop?.platformActual ?? nextStop?.platform)
                      ? ` · Gl. ${nextStop?.platformActual ?? nextStop?.platform}`
                      : ''}${nextStop?.platformActual && nextStop?.platform &&
                        nextStop.platformActual !== nextStop.platform
                      ? ' (geändert)'
                      : ''}`
                  : null,
                subColor: nextStop?.platformActual && nextStop?.platform &&
                  nextStop.platformActual !== nextStop.platform
                  ? '#EF9F27'
                  : '#3a4a5a',
              },
              {
                label: 'Verbleibend',
                value: `${remainingStops} Halte`,
                valueColor: '#2dd4b0',
                sub: null,
                subColor: undefined,
                valueFontSize: undefined,
              },
            ].map(({ label, value, valueColor, valueFontSize, sub, subColor }, index, items) => (
              <div
                key={label}
                style={{
                  padding: '10px 18px',
                  borderRight: index < items.length - 1 ? '0.5px solid #1a2030' : 'none',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: '#3a4a5a',
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                    marginBottom: 3,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: valueFontSize ?? 16,
                    fontWeight: 700,
                    color: valueColor,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                    marginTop: valueFontSize ? 2 : 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {value}
                </div>
                {sub && (
                  <div
                    style={{
                      fontSize: 10,
                      color: subColor ?? '#3a4a5a',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
