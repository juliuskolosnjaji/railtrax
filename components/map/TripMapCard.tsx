'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Leg } from '@/hooks/useTrips'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/fiord'
const ROUTE_COLOR = '#40e0b0'
const BG_COLOR = '#0d1117'

export function TripMapCard({ legs }: { legs: Leg[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      interactive: true,
      attributionControl: false,
    })
    mapRef.current = map

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    )

    map.on('load', () => {
      // ── Build route coordinates ──────────────────────────────────────────
      const allCoords: [number, number][] = []

      for (const leg of legs) {
        if (leg.polyline && leg.polyline.length >= 2) {
          // polyline is stored as [lon, lat][] pairs
          allCoords.push(...leg.polyline)
        } else {
          if (leg.originLon != null && leg.originLat != null)
            allCoords.push([leg.originLon, leg.originLat])
          if (leg.destLon != null && leg.destLat != null)
            allCoords.push([leg.destLon, leg.destLat])
        }
      }

      if (allCoords.length < 2) return

      // Deduplicate consecutive identical points
      const deduped = allCoords.filter(
        (c, i) =>
          i === 0 ||
          c[0] !== allCoords[i - 1][0] ||
          c[1] !== allCoords[i - 1][1],
      )

      // ── Route line ───────────────────────────────────────────────────────
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: deduped },
          properties: {},
        },
      })

      // Glow
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ROUTE_COLOR, 'line-width': 10, 'line-opacity': 0.12 },
      })

      // Dashed line
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ROUTE_COLOR,
          'line-width': 2.5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.95,
        },
      })

      // ── Station points ───────────────────────────────────────────────────
      const features: GeoJSON.Feature<GeoJSON.Point>[] = []

      legs.forEach((leg, i) => {
        if (leg.originLon != null && leg.originLat != null) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [leg.originLon, leg.originLat] },
            properties: { name: leg.originName },
          })
        }
        if (i === legs.length - 1 && leg.destLon != null && leg.destLat != null) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [leg.destLon, leg.destLat] },
            properties: { name: leg.destName },
          })
        }
      })

      const stationData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      }

      map.addSource('stations', { type: 'geojson', data: stationData })

      // Outer glow ring
      map.addLayer({
        id: 'station-glow',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': 9,
          'circle-color': `${ROUTE_COLOR}1f`,
        },
      })

      // Dot
      map.addLayer({
        id: 'station-dot',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': 5,
          'circle-color': ROUTE_COLOR,
          'circle-stroke-width': 2,
          'circle-stroke-color': BG_COLOR,
        },
      })

      // Label (optional — only renders if font is in style)
      map.addLayer({
        id: 'station-label',
        type: 'symbol',
        source: 'stations',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.8],
          'text-optional': true,
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': BG_COLOR,
          'text-halo-width': 2,
        },
      })

      // ── Fit bounds ───────────────────────────────────────────────────────
      const bounds = deduped.reduce(
        (b, [lng, lat]) => b.extend([lng, lat] as [number, number]),
        new maplibregl.LngLatBounds(deduped[0], deduped[0]),
      )
      map.fitBounds(bounds, {
        padding: { top: 40, bottom: 40, left: 40, right: 60 },
        maxZoom: 9,
        duration: 0,
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="trip-map-card"
      style={{ height: 280, background: BG_COLOR }}
    />
  )
}
