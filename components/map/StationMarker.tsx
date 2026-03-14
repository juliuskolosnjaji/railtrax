'use client'

import { useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import type { Leg } from '@/hooks/useTrips'

interface StationMarkerProps {
  leg: Leg
  type: 'origin' | 'destination'
  isTransfer?: boolean
}

function formatTime(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function StationMarker({ leg, type, isTransfer = false }: StationMarkerProps) {
  const [showPopup, setShowPopup] = useState(false)

  const lon = type === 'origin' ? leg.originLon : leg.destLon
  const lat = type === 'origin' ? leg.originLat : leg.destLat
  const name = type === 'origin' ? leg.originName : leg.destName
  const time = type === 'origin' ? leg.plannedDeparture : leg.plannedArrival
  const actualTime = type === 'origin' ? leg.actualDeparture : leg.actualArrival
  const label = type === 'origin' ? 'Abfahrt' : 'Ankunft'

  if (lon == null || lat == null) return null

  const hasDelay = leg.delayMinutes > 0

  // Different styling based on type
  const isOrigin = type === 'origin'
  const isDestination = type === 'destination'

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
          className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-transform hover:scale-125 ${
            isTransfer
              ? 'bg-gradient-to-br from-white to-[#4f8ef7] border-white'
              : isOrigin
                ? 'bg-white border-[#4f8ef7]'
                : 'bg-[#4f8ef7] border-white'
          }`}
          style={{
            boxShadow: isDestination ? '0 0 8px rgba(79, 142, 247, 0.6)' : 'none',
          }}
        />
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
