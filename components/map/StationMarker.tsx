'use client'

import { useState } from 'react'
import { Marker, Popup } from 'react-map-gl/maplibre'
import type { Leg } from '@/hooks/useTrips'

interface StationMarkerProps {
  leg: Leg
  type: 'origin' | 'destination'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function StationMarker({ leg, type }: StationMarkerProps) {
  const [showPopup, setShowPopup] = useState(false)

  const lon = type === 'origin' ? leg.originLon : leg.destLon
  const lat = type === 'origin' ? leg.originLat : leg.destLat
  const name = type === 'origin' ? leg.originName : leg.destName
  const time = type === 'origin' ? leg.plannedDeparture : leg.plannedArrival
  const actualTime = type === 'origin' ? leg.actualDeparture : leg.actualArrival
  const label = type === 'origin' ? 'Dep' : 'Arr'

  if (lon == null || lat == null) return null

  const hasDelay = leg.delayMinutes > 0

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
          className={`w-2.5 h-2.5 rounded-full border-2 cursor-pointer transition-transform hover:scale-125 ${
            type === 'origin'
              ? 'bg-zinc-900 border-zinc-400'
              : 'bg-zinc-900 border-zinc-500'
          }`}
        />
      </Marker>

      {showPopup && (
        <Popup
          longitude={lon}
          latitude={lat}
          anchor="bottom"
          offset={10}
          closeButton
          onClose={() => setShowPopup(false)}
          className="z-10"
        >
          <div className="bg-zinc-900 text-white rounded-lg p-3 min-w-[160px] text-sm shadow-xl border border-zinc-700">
            <p className="font-semibold mb-1 truncate">{name}</p>
            <p className="text-zinc-400 text-xs">
              {label}: {formatTime(time)}
            </p>
            {actualTime && actualTime !== time && (
              <p className={`text-xs mt-0.5 ${hasDelay ? 'text-amber-400' : 'text-emerald-400'}`}>
                Actual: {formatTime(actualTime)}
                {hasDelay && ` (+${leg.delayMinutes} min)`}
              </p>
            )}
            {leg.trainNumber && (
              <p className="text-zinc-500 text-xs mt-1">
                {leg.operator && `${leg.operator} · `}{leg.trainNumber}
              </p>
            )}
          </div>
        </Popup>
      )}
    </>
  )
}
