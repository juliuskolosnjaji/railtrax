'use client'

import { useRef, useEffect, useState } from 'react'
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Leg } from '@/hooks/useTrips'
import { RouteLayer } from './RouteLayer'
import { StationMarker } from './StationMarker'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/fiord'

interface TripMapProps {
  legs: Leg[]
  preview?: boolean
  className?: string
}

export function TripMap({ legs, preview = false, className = '' }: TripMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [showRailway, setShowRailway] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Fit bounds whenever legs with coordinates change, but only after map has loaded
  useEffect(() => {
    if (!mapLoaded) return
    const map = mapRef.current
    if (!map) return

    const lons: number[] = []
    const lats: number[] = []

    for (const leg of legs) {
      if (leg.polyline && leg.polyline.length >= 2) {
        for (const [lon, lat] of leg.polyline) {
          lons.push(lon)
          lats.push(lat)
        }
      } else {
        if (leg.originLon != null && leg.originLat != null) {
          lons.push(leg.originLon)
          lats.push(leg.originLat)
        }
        if (leg.destLon != null && leg.destLat != null) {
          lons.push(leg.destLon)
          lats.push(leg.destLat)
        }
      }
    }

    if (lons.length >= 2) {
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { 
          padding: preview ? { top: 40, bottom: 40, left: 40, right: 40 } : 64, 
          duration: 800, 
          maxZoom: preview ? 14 : 12 
        },
      )
    }
  }, [legs, mapLoaded, preview])

  // Unique stations for markers:
  // Show origin of every leg + destination of the final leg only
  // (intermediate stations are shared — they appear as leg N's dest = leg N+1's origin)
  const originLegs = legs
  const finalLeg = legs[legs.length - 1]

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/*
        The Map is NEVER conditionally rendered — the instance must persist.
        Content (Sources, Layers, Markers) is conditionally rendered inside it.
      */}
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: 10, latitude: 51, zoom: 4 }}
        style={{ width: '100%', height: '100%' }}
        onLoad={() => setMapLoaded(true)}
        scrollZoom={preview ? false : undefined}
        dragPan={preview ? false : undefined}
        dragRotate={preview ? false : undefined}
        touchZoomRotate={preview ? false : undefined}
        keyboard={preview ? false : undefined}
        attributionControl={preview ? false : undefined}
      >
        {/* NavigationControl - only in full map mode */}
        {!preview && <NavigationControl position="top-right" />}

        {/* Route lines */}
        {legs.map((leg) => (
          <RouteLayer key={leg.id} leg={leg} />
        ))}

        {/* Station markers — origin of each leg */}
        {originLegs.map((leg) => (
          <StationMarker key={`orig-${leg.id}`} leg={leg} type="origin" />
        ))}

        {/* Final destination */}
        {finalLeg && (
          <StationMarker key={`dest-${finalLeg.id}`} leg={finalLeg} type="destination" />
        )}

        {/* OpenRailwayMap overlay (toggled) - only in full map mode */}
        {!preview && showRailway && (
          <Source
            id="openrailwaymap-src"
            type="raster"
            tiles={['https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png']}
            tileSize={256}
            attribution="© OpenRailwayMap contributors"
          >
            <Layer id="openrailwaymap" type="raster" paint={{ 'raster-opacity': 0.7 }} />
          </Source>
        )}
      </Map>

      {/* Railway overlay toggle - only in full map mode */}
      {!preview && (
        <button
          onClick={() => setShowRailway((prev) => !prev)}
          className={`absolute bottom-8 left-3 rounded-md px-3 py-1.5 text-xs font-medium shadow transition-colors ${
            showRailway
              ? 'bg-white text-zinc-900'
              : 'bg-zinc-900/80 backdrop-blur text-zinc-300 border border-zinc-700 hover:bg-zinc-800'
          }`}
        >
          🛤 Railway overlay
        </button>
      )}
    </div>
  )
}
