'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Leg } from '@/hooks/useTrips'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/fiord'
const ROUTE_COLOR = '#40e0b0'
const BG_COLOR = '#0d1117'

// ── Polyline clipping ──────────────────────────────────────────────────────

function distSq(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
}

function closestIndex(coords: [number, number][], target: [number, number]): number {
  let best = 0
  let bestDist = Infinity
  coords.forEach((c, i) => {
    const d = distSq(c, target)
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}

function clipPolylineToLeg(
  coords: [number, number][],
  originLon: number,
  originLat: number,
  destLon: number,
  destLat: number,
): [number, number][] {
  if (coords.length < 2) return coords

  const originIdx = closestIndex(coords, [originLon, originLat])
  const destIdx   = closestIndex(coords, [destLon,   destLat])

  const start = Math.min(originIdx, destIdx)
  const end   = Math.max(originIdx, destIdx)

  if (start === end) return [[originLon, originLat], [destLon, destLat]]

  return coords.slice(start, end + 1)
}

export function TripMapCard({ legs, height = 280 }: { legs: Leg[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      interactive: true,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },  // required for canvas.toDataURL() in exports
    })
    mapRef.current = map

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right',
    )

    map.on('load', () => {
      // ── Add missing sprite images the style expects ────────────────────────
      if (!map.hasImage('circle-11')) {
        const size = 22
        const cvs = document.createElement('canvas')
        cvs.width = cvs.height = size
        const ctx = cvs.getContext('2d')!
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#4f8ef7'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
        map.addImage('circle-11', { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data }, { pixelRatio: 1 })
      }

      // ── Build route coordinates ──────────────────────────────────────────
      const allCoords: [number, number][] = []

      for (const leg of legs) {
        const hasCoords =
          leg.originLon != null && leg.originLat != null &&
          leg.destLon   != null && leg.destLat   != null

        if (leg.polyline && leg.polyline.length >= 2 && hasCoords) {
          // Clip the full train-line polyline to just this leg's segment
          const clipped = clipPolylineToLeg(
            leg.polyline,
            leg.originLon!,
            leg.originLat!,
            leg.destLon!,
            leg.destLat!,
          )
          allCoords.push(...clipped)
        } else if (hasCoords) {
          // No polyline — straight line between origin and destination
          allCoords.push([leg.originLon!, leg.originLat!])
          allCoords.push([leg.destLon!,   leg.destLat!])
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
      style={{ height, background: BG_COLOR }}
    />
  )
}
