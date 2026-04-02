'use client'

import dynamic from 'next/dynamic'
const Map = dynamic(() => import('react-map-gl/maplibre'), { ssr: false })
import { Layer, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

// Named stops — rendered as markers with labels
const DEMO_STATIONS = [
  { name: 'Amsterdam', lon: 4.900, lat: 52.378 },
  { name: 'Köln',      lon: 6.959, lat: 50.943 },
  { name: 'Frankfurt', lon: 8.663, lat: 50.107 },
  { name: 'München',   lon: 11.558, lat: 48.140 },
  { name: 'Wien',      lon: 16.373, lat: 48.208 },
]

// Full route with intermediate waypoints so the line follows real rail geography
// ICE 228: Amsterdam → Köln → Frankfurt
// RJ 68:   Frankfurt → München → Wien
const ROUTE_COORDS: [number, number][] = [
  [4.900, 52.378],  // Amsterdam
  [5.110, 52.090],  // Utrecht
  [5.900, 51.985],  // Arnhem
  [6.245, 51.838],  // Emmerich (NL/DE border)
  [6.859, 51.469],  // Oberhausen
  [6.794, 51.224],  // Düsseldorf
  [6.959, 50.943],  // Köln
  [7.202, 50.793],  // Siegburg (HSL start)
  [7.828, 50.435],  // Montabaur
  [8.065, 50.383],  // Limburg
  [8.663, 50.107],  // Frankfurt
  [9.180, 50.130],  // Hanau
  [9.959, 49.802],  // Würzburg
  [11.082, 49.453], // Nürnberg
  [11.422, 48.764], // Ingolstadt
  [11.558, 48.140], // München
  [12.128, 47.857], // Rosenheim
  [13.045, 47.813], // Salzburg
  [13.723, 48.005], // Attnang-Puchheim
  [14.027, 48.159], // Wels
  [14.285, 48.306], // Linz
  [14.873, 48.122], // Amstetten
  [15.625, 48.200], // St. Pölten
  [16.373, 48.208], // Wien
]

const DEMO_ROUTE: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: ROUTE_COORDS },
}

export default function DemoMap() {
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <Map
        initialViewState={{
          longitude: 10.5,
          latitude: 50.0,
          zoom: 4.2,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/fiord"
        scrollZoom={false}
        dragPan={false}
        dragRotate={false}
        touchZoomRotate={false}
        attributionControl={false}
      >
        {/* Route line */}
        <Source id="demo-route" type="geojson" data={DEMO_ROUTE}>
          {/* Glow effect */}
          <Layer
            id="demo-route-glow"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': '#34d4b0',
              'line-width': 12,
              'line-opacity': 0.12,
            }}
          />
          {/* Main line */}
          <Layer
            id="demo-route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': '#34d4b0',
              'line-width': 3,
              'line-opacity': 0.9,
            }}
          />
        </Source>

        {/* Station markers */}
        {DEMO_STATIONS.map((station, i) => (
          <Source
            key={station.name}
            id={`station-${i}`}
            type="geojson"
            data={{
              type: 'Feature',
              properties: { name: station.name },
              geometry: { type: 'Point', coordinates: [station.lon, station.lat] },
            }}
          >
            <Layer
              id={`station-dot-${i}`}
              type="circle"
              paint={{
                'circle-radius': i === 0 || i === DEMO_STATIONS.length - 1 ? 6 : 4,
                'circle-color': i === 0 || i === DEMO_STATIONS.length - 1 ? '#34d4b0' : '#0a1628',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#34d4b0',
              }}
            />
            <Layer
              id={`station-label-${i}`}
              type="symbol"
              layout={{
                'text-field': station.name,
                'text-size': 12,
                'text-offset': [0, -1.5],
                'text-anchor': 'bottom',
                'text-font': ['Noto Sans Regular'],
              }}
              paint={{
                'text-color': '#8ba3c7',
                'text-halo-color': '#080d1a',
                'text-halo-width': 1.5,
              }}
            />
          </Source>
        ))}
      </Map>
    </div>
  )
}
