'use client'

import { Source, Layer } from 'react-map-gl/maplibre'
import type { Leg } from '@/hooks/useTrips'

const OPERATOR_COLORS: Record<string, string> = {
  DB: '#E32228',
  SBB: '#EB0000',
  ÖBB: '#C8102E',
}

function getColor(operator: string | null): string {
  return operator ? (OPERATOR_COLORS[operator] ?? '#6B7280') : '#6B7280'
}

interface RouteLayerProps {
  leg: Leg
}

export function RouteLayer({ leg }: RouteLayerProps) {
  // Priority 1: stored polyline (real route shape)
  // Priority 2: straight line between origin/dest lat-lon (always visible even before polyline is fetched)
  let coordinates: [number, number][] | null = null
  let isDashed = false

  if (leg.polyline && leg.polyline.length >= 2) {
    coordinates = leg.polyline
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

  const color = getColor(leg.operator)

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
