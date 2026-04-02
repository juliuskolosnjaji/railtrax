'use client'

import dynamic from 'next/dynamic'
const Map = dynamic(() => import('react-map-gl/maplibre'), { ssr: false })
import { Layer, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const DEMO_STATIONS = [
  { name: 'Amsterdam', lon: 4.900, lat: 52.378 },
  { name: 'Köln',      lon: 6.959, lat: 50.943 },
  { name: 'Frankfurt', lon: 8.663, lat: 50.107 },
  { name: 'München',   lon: 11.558, lat: 48.140 },
  { name: 'Wien',      lon: 16.373, lat: 48.208 },
]

const DEMO_ROUTE: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: DEMO_STATIONS.map(s => [s.lon, s.lat]),
  },
}

export default function DemoMap() {
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <Map
        initialViewState={{
          longitude: 10.5,
          latitude: 50.5,
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

      {/* Train badges top-right */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        display: 'flex', gap: '6px',
      }}>
        {['ICE 228', 'RJ 68'].map(train => (
          <div key={train} style={{
            background: '#0d1f3c',
            border: '1px solid #1e3a6e',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: 12,
            color: '#34d4b0',
            fontWeight: 500,
          }}>
            {train}
          </div>
        ))}
      </div>
    </div>
  )
}
