'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import type { Leg } from '@/hooks/useTrips'
import { getOperatorColors } from '@/lib/operators'

function clipPolylineToLeg(
  polyline: [number, number][],
  originCoords: [number, number],
  destCoords: [number, number]
): [number, number][] {
  if (polyline.length < 2) return polyline

  const originIdx = polyline.reduce((best, point, i) => {
    const dist = Math.hypot(point[0] - originCoords[0], point[1] - originCoords[1])
    return dist < best.dist ? { i, dist } : best
  }, { i: 0, dist: Infinity }).i

  const destIdx = polyline.reduce((best, point, i) => {
    const dist = Math.hypot(point[0] - destCoords[0], point[1] - destCoords[1])
    return dist < best.dist ? { i, dist } : best
  }, { i: 0, dist: Infinity }).i

  const start = Math.min(originIdx, destIdx)
  const end   = Math.max(originIdx, destIdx)
  return polyline.slice(start, end + 1)
}

interface RouteLayerProps {
  leg: Leg
}

export function RouteLayer({ leg }: RouteLayerProps) {
  // Priority 1: stored polyline (real route shape), clipped to leg segment
  // Priority 2: straight line between origin/dest lat-lon
  let coordinates: [number, number][] | null = null
  let isDashed = false

  if (leg.polyline && leg.polyline.length >= 2) {
    if (leg.originLon != null && leg.originLat != null && leg.destLon != null && leg.destLat != null) {
      coordinates = clipPolylineToLeg(
        leg.polyline,
        [leg.originLon, leg.originLat],
        [leg.destLon, leg.destLat]
      )
    } else {
      coordinates = leg.polyline
    }
  } else if (
    leg.originLon != null &&
    leg.originLat != null &&
    leg.destLon != null &&
    leg.destLat != null
  ) {
    coordinates = [
      [leg.originLon, leg.originLat],
      [leg.destLon, leg.destLat],
    ]
    isDashed = true   // dashed to signal "approximate — real polyline loading"
  }

  if (!coordinates) return null

  const color = getOperatorColors(leg.operator).line

  const paint = isDashed
    ? {
        'line-color': color,
        'line-width': 2,
        'line-opacity': 0.6,
        'line-dasharray': [4, 3] as number[],
      }
    : {
        'line-color': color,
        'line-width': 3,
        'line-opacity': 0.85,
      }

  const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: { legId: leg.id },
    geometry: { type: 'LineString', coordinates },
  }

  return (
    <Source id={`route-${leg.id}`} type="geojson" data={geojson}>
      <Layer
        id={`route-line-${leg.id}`}
        type="line"
        paint={paint}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
    </Source>
  )
}
