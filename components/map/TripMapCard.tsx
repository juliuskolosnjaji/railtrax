'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Leg } from '@/hooks/useTrips'
import type { Feature, FeatureCollection, LineString, Point } from 'geojson'

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

function buildRouteCoordinates(legs: Leg[]): [number, number][] {
  const allCoords: [number, number][] = []

  for (const leg of legs) {
    const hasCoords =
      leg.originLon != null && leg.originLat != null &&
      leg.destLon != null && leg.destLat != null

    if (leg.polyline && leg.polyline.length >= 2 && hasCoords) {
      const clipped = clipPolylineToLeg(
        leg.polyline,
        leg.originLon!,
        leg.originLat!,
        leg.destLon!,
        leg.destLat!,
      )
      allCoords.push(...clipped)
    } else if (hasCoords) {
      allCoords.push([leg.originLon!, leg.originLat!])
      allCoords.push([leg.destLon!, leg.destLat!])
    }
  }

  return allCoords.filter(
    (coord, index) =>
      index === 0 ||
      coord[0] !== allCoords[index - 1][0] ||
      coord[1] !== allCoords[index - 1][1],
  )
}

function buildStationFeatures(legs: Leg[]): Feature<Point>[] {
  const features: Feature<Point>[] = []

  legs.forEach((leg, index) => {
    if (leg.originLon != null && leg.originLat != null) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [leg.originLon, leg.originLat] },
        properties: { name: leg.originName },
      })
    }

    if (index === legs.length - 1 && leg.destLon != null && leg.destLat != null) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [leg.destLon, leg.destLat] },
        properties: { name: leg.destName },
      })
    }
  })

  return features
}

function ensureMapAssets(map: maplibregl.Map) {
  if (map.hasImage('circle-11')) return

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

function syncMapData(map: maplibregl.Map, legs: Leg[]) {
  const routeCoordinates = buildRouteCoordinates(legs)
  const routeFeatureCollection: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: routeCoordinates.length >= 2
      ? [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeCoordinates },
          properties: {},
        }]
      : [],
  }
  const stationFeatureCollection: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: buildStationFeatures(legs),
  }

  const routeSource = map.getSource('route') as maplibregl.GeoJSONSource | undefined
  if (routeSource) {
    routeSource.setData(routeFeatureCollection)
  } else {
    map.addSource('route', {
      type: 'geojson',
      data: routeFeatureCollection,
    })

    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ROUTE_COLOR, 'line-width': 10, 'line-opacity': 0.12 },
    })

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
  }

  const stationSource = map.getSource('stations') as maplibregl.GeoJSONSource | undefined
  if (stationSource) {
    stationSource.setData(stationFeatureCollection)
  } else {
    map.addSource('stations', { type: 'geojson', data: stationFeatureCollection })

    map.addLayer({
      id: 'station-glow',
      type: 'circle',
      source: 'stations',
      paint: {
        'circle-radius': 9,
        'circle-color': `${ROUTE_COLOR}1f`,
      },
    })

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
  }

  if (routeCoordinates.length < 2) return

  const bounds = routeCoordinates.reduce(
    (currentBounds, [lng, lat]) => currentBounds.extend([lng, lat] as [number, number]),
    new maplibregl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]),
  )

  map.fitBounds(bounds, {
    padding: { top: 40, bottom: 40, left: 40, right: 60 },
    maxZoom: 9,
    duration: 0,
  })
}

export function TripMapCard({ legs, height = 280, containerId }: { legs: Leg[]; height?: number; containerId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const isLoadedRef = useRef(false)

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
      isLoadedRef.current = true
      ensureMapAssets(map)
      syncMapData(map, legs)
    })

    return () => {
      isLoadedRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isLoadedRef.current) return

    syncMapData(map, legs)
  }, [legs])

  return (
    <div
      ref={containerRef}
      id={containerId}
      className="trip-map-card"
      style={{ height, background: BG_COLOR }}
    />
  )
}
