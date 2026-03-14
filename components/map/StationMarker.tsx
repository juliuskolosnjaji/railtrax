'use client'

import { useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import type { Leg } from '@/hooks/useTrips'

interface StationMarkerProps {
  leg: Leg
  type: 'boarding' | 'alighting'
  isFirst?: boolean
  isLast?: boolean
}

function formatTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function StationMarker({ leg, type, isFirst = false, isLast = false }: StationMarkerProps) {
  const [showPopup, setShowPopup] = useState(false)

  const lon = type === 'boarding' ? leg.originLon : leg.destLon
  const lat = type === 'boarding' ? leg.originLat : leg.destLat
  const name = type === 'boarding' ? leg.originName : leg.destName
  const time = type === 'boarding' ? leg.plannedDeparture : leg.plannedArrival
  const actualTime = type === 'boarding' ? leg.actualDeparture : leg.actualArrival
  const label = type === 'boarding' ? 'Abfahrt' : 'Ankunft'

  if (lon == null || lat == null) return null

  const hasDelay = leg.delayMinutes > 0
  const isBoarding = type === 'boarding'

  return (
    <>
      <Marker
        longitude={lon}
        latitude={lat}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation()
          setShowPopup(true)
        }}
      >
        <div
          className="cursor-pointer transition-transform hover:scale-125"
          style={{
            width: isBoarding ? 16 : 16,
            height: isBoarding ? 16 : 16,
            borderRadius: '50%',
            borderWidth: 2,
            borderStyle: 'solid',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...(isBoarding
              ? { backgroundColor: '#ffffff', borderColor: '#4f8ef7' }
              : isLast
                ? { backgroundColor: '#4f8ef7', borderColor: '#ffffff' }
                : { backgroundColor: '#080d1a', borderColor: '#f59e0b' }
            ),
            boxShadow: isLast ? '0 0 8px rgba(79, 142, 247, 0.6)' : 'none',
          }}
        >
          {isBoarding && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4f8ef7' }} />
          )}
          {!isBoarding && !isLast && (
            <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          )}
        </div>
      </Marker>

      {showPopup && (
        <Popup
          longitude={lon}
          latitude={lat}
          anchor="bottom"
          offset={12}
          closeButton
          onClose={() => setShowPopup(false)}
          className="z-10"
        >
          <div className="bg-[#080d1a] text-white rounded-lg p-3 min-w-[180px] text-sm shadow-xl border border-[#1e2d4a]">
            <p className="font-semibold mb-2 truncate">{name}</p>
            <div className="border-t border-[#1e2d4a] pt-2 mt-2">
              <p className="text-[#8ba3c7] text-xs mb-1">{label}</p>
              <p className="text-white font-medium">
                {formatTime(time)}
                {actualTime && actualTime !== time && (
                  <span className={hasDelay ? 'text-amber-400 ml-2' : 'text-emerald-400 ml-2'}>
                    → {formatTime(actualTime)}
                    {hasDelay && ` (+${leg.delayMinutes} min)`}
                  </span>
                )}
              </p>
            </div>
            {(leg.trainNumber || leg.operator) && (
              <div className="border-t border-[#1e2d4a] pt-2 mt-2">
                <p className="text-[#8ba3c7] text-xs mb-1">Zug</p>
                <p className="text-[#4f8ef7] font-medium">
                  {leg.operator && <span className="mr-2">{leg.operator}</span>}
                  {leg.trainNumber}
                </p>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  )
}
