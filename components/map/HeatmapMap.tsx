'use client'

import { useRef, useEffect, useState } from 'react'
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

interface GeoJSON {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    geometry: {
      type: 'LineString'
      coordinates: [number, number][]
    }
    properties: {
      origin: string
      destination: string
      operator: string | null
      distanceKm: number | null
    }
  }[]
}

interface HeatmapMapProps {
  geojson: GeoJSON
}

export function HeatmapMap({ geojson }: HeatmapMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [zoom, setZoom] = useState(4)

  useEffect(() => {
    if (!mapLoaded) return
    const map = mapRef.current
    if (!map) return

    const lons: number[] = []
    const lats: number[] = []

    for (const feature of geojson.features) {
      for (const [lon, lat] of feature.geometry.coordinates) {
        lons.push(lon)
        lats.push(lat)
      }
    }

    if (lons.length >= 2) {
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 64, duration: 800, maxZoom: 12 },
      )
    }
  }, [geojson, mapLoaded])

  const showHeatmap = zoom < 7

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: 10, latitude: 51, zoom: 4 }}
        style={{ width: '100%', height: '100%' }}
        onLoad={() => setMapLoaded(true)}
        onZoom={(e) => setZoom(e.viewState.zoom)}
      >
        <NavigationControl position="top-right" />

        {showHeatmap ? (
          <Source id="heatmap-src" type="geojson" data={geojson}>
            <Layer
              id="heatmap-line"
              type="line"
              paint={{
                'line-color': [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0, '#22c55e',
                  0.5, '#eab308',
                  1, '#ef4444',
                ],
                'line-width': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  3, 2,
                  8, 6,
                ],
                'line-opacity': 0.7,
                'line-blur': 3,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        ) : (
          <Source id="routes-src" type="geojson" data={geojson}>
            <Layer
              id="routes-line"
              type="line"
              paint={{
                'line-color': '#8b5cf6',
                'line-width': 3,
                'line-opacity': 0.85,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}
      </Map>

      <div className="absolute bottom-8 left-3 rounded-md px-3 py-1.5 text-xs font-medium bg-zinc-900/80 backdrop-blur text-zinc-300 border border-zinc-700">
        {showHeatmap ? '🗺 Heatmap view' : '🛤 Route view'} (zoom {zoom < 7 ? '<' : '>'} 7)
      </div>
    </div>
  )
}
