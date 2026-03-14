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
    <div style={{ position: 'relative', height: '420px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e2d4a' }}>
      <Map
        initialViewState={{
          longitude: 10.5,
          latitude: 50.5,
          zoom: 4.2,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/fiord"
        scrollZoom={true}
        dragPan={true}
        dragRotate={false}
        touchZoomRotate={true}
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
              'line-color': '#4f8ef7',
              'line-width': 10,
              'line-opacity': 0.15,
            }}
          />
          {/* Main line */}
          <Layer
            id="demo-route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': '#4f8ef7',
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
                'circle-color': i === 0 || i === DEMO_STATIONS.length - 1 ? '#4f8ef7' : '#0a1628',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#4f8ef7',
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

      {/* Route info overlay bottom-left */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        background: 'rgba(8,13,26,0.85)',
        border: '1px solid #1e2d4a',
        borderRadius: '8px',
        padding: '8px 14px',
        display: 'flex', gap: '20px',
        backdropFilter: 'blur(4px)',
      }}>
        {[
          { label: 'STRECKE', value: '1.428 km' },
          { label: 'DAUER', value: '13h 28m' },
          { label: 'ZÜGE', value: '2' },
          { label: 'CO₂ GESPART', value: '314 kg', color: '#3ecf6e' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#4a6a9a', letterSpacing: '1px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: stat.color ?? '#ffffff' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

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
            color: '#4f8ef7',
            fontWeight: 500,
          }}>
            {train}
          </div>
        ))}
      </div>
    </div>
  )
}
