'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Stop {
  name: string
  id: string | null
  plannedDeparture?: string | null
  plannedArrival?: string | null
  departureDelay?: number
  arrivalDelay?: number
  cancelled?: boolean
  isPassed: boolean
  lat?: number | null
  lon?: number | null
}

interface Props {
  stopovers: Stop[]
  currentIdx: number
  height?: number | string
}

const BG     = '#0d1117'
const TEAL   = '#2dd4b0'
const FONT   = ['Open Sans Regular', 'Noto Sans Regular']

export function TrainRouteMap({ stopovers, currentIdx, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const markerRef    = useRef<maplibregl.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const stopsWithCoords = stopovers.filter(s => s.lon != null && s.lat != null)
    if (stopsWithCoords.length < 2) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/fiord',
      interactive: true,
      attributionControl: false,
    })
    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.on('load', () => {
      const coords = stopsWithCoords.map(s => [s.lon!, s.lat!] as [number, number])

      // ── Full route glow ───────────────────────────────────────────────
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} },
      })
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': TEAL, 'line-width': 10, 'line-opacity': 0.1 },
      })

      // ── Passed segment (solid) ────────────────────────────────────────
      const passedCoords = coords.slice(0, Math.min(currentIdx + 1, coords.length))
      if (passedCoords.length >= 2) {
        map.addSource('route-passed', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: passedCoords }, properties: {} },
        })
        map.addLayer({
          id: 'route-passed-line',
          type: 'line',
          source: 'route-passed',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': TEAL, 'line-width': 2.5, 'line-opacity': 1 },
        })
      }

      // ── Future segment (dashed) ───────────────────────────────────────
      const futureCoords = coords.slice(currentIdx)
      if (futureCoords.length >= 2) {
        map.addSource('route-future', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: futureCoords }, properties: {} },
        })
        map.addLayer({
          id: 'route-future-line',
          type: 'line',
          source: 'route-future',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': TEAL, 'line-width': 2, 'line-dasharray': [3, 3], 'line-opacity': 0.5 },
        })
      }

      // ── Station features ──────────────────────────────────────────────
      const features: GeoJSON.Feature<GeoJSON.Point>[] = stopsWithCoords.map((stop, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [stop.lon!, stop.lat!] },
        properties: {
          name:      stop.name,
          isPassed:  stop.isPassed,
          isCurrent: i === currentIdx,
          isEnd:     i === 0 || i === stopsWithCoords.length - 1,
        },
      }))

      map.addSource('stations', { type: 'geojson', data: { type: 'FeatureCollection', features } })

      // Glow ring
      map.addLayer({
        id: 'station-glow',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': ['case', ['get', 'isCurrent'], 8, ['get', 'isEnd'], 8, 5],
          'circle-color':  ['case', ['get', 'isCurrent'], 'rgba(255,255,255,0.15)', 'rgba(45,212,176,0.08)'],
        },
      })

      // Dot fill
      map.addLayer({
        id: 'station-dot',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': ['case', ['get', 'isCurrent'], 5, ['get', 'isEnd'], 5, 3.5],
          'circle-color': [
            'case',
            ['get', 'isCurrent'], '#ffffff',
            ['get', 'isPassed'],  TEAL,
            ['get', 'isEnd'],     '#ffffff',
            '#4a5568',
          ],
          'circle-stroke-width': ['case', ['get', 'isCurrent'], 2, ['get', 'isEnd'], 2, 1.5],
          'circle-stroke-color': BG,
        },
      })

      // Labels
      map.addLayer({
        id: 'station-label',
        type: 'symbol',
        source: 'stations',
        layout: {
          'text-field':    ['get', 'name'],
          'text-font':     FONT,
          'text-size':     ['case', ['get', 'isCurrent'], 13, ['get', 'isEnd'], 12, 10],
          'text-anchor':   'bottom',
          'text-offset':   [0, -0.9],
          'text-optional': true,
          'text-allow-overlap': false,
          'symbol-sort-key': ['case', ['get', 'isCurrent'], 3, ['get', 'isEnd'], 2, 1],
        },
        paint: {
          'text-color': ['case', ['get', 'isCurrent'], TEAL, ['get', 'isEnd'], '#f0f4f8', '#8ba3c7'],
          'text-halo-color': BG,
          'text-halo-width': 2,
        },
      })

      // ── Fit bounds ────────────────────────────────────────────────────
      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      )
      map.fitBounds(bounds, { padding: { top: 48, bottom: 48, left: 40, right: 40 }, maxZoom: 10, duration: 0 })

      // ── Pulsing current-position marker ──────────────────────────────
      const currentStop = stopsWithCoords[currentIdx]
      if (currentStop?.lon != null && currentStop?.lat != null) {
        const el = document.createElement('div')
        el.style.cssText = `
          width: 10px; height: 10px; border-radius: 50%;
          background: #ffffff; border: 2px solid ${BG};
          animation: trainPulse 2s infinite;
        `
        // Inject pulse keyframes once
        if (!document.getElementById('train-pulse-style')) {
          const style = document.createElement('style')
          style.id = 'train-pulse-style'
          style.textContent = `
            @keyframes trainPulse {
              0%   { box-shadow: 0 0 0 0  rgba(255,255,255,0.5); }
              70%  { box-shadow: 0 0 0 7px rgba(255,255,255,0);   }
              100% { box-shadow: 0 0 0 0  rgba(255,255,255,0);    }
            }
          `
          document.head.appendChild(style)
        }
        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([currentStop.lon, currentStop.lat])
          .addTo(map)
      }
    })

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ height, background: BG }} />
      <div style={{
        position: 'absolute', bottom: 6, left: 8,
        fontSize: 9, color: 'rgba(255,255,255,0.3)',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        © OpenFreeMap · OpenStreetMap
      </div>
    </div>
  )
}
