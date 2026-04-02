export async function fetchRouteMapImage(
  legs: Array<{
    origin_lat: number | null
    origin_lon: number | null
    destination_lat: number | null
    destination_lon: number | null
    polyline?: { coordinates: number[][] } | null
    operator?: string | null
  }>,
  width: number,
  height: number
): Promise<string | null> {
  const geometries = legs
    .filter(l => l.origin_lat && l.destination_lat)
    .map(leg => {
      const color = leg.operator === 'DB' ? '#E32228'
                  : leg.operator === 'SBB' ? '#EB0000'
                  : leg.operator === 'ÖBB' ? '#C8102E'
                  : '#4f8ef7'

      const polylineCoords = leg.polyline?.coordinates
      if (polylineCoords && polylineCoords.length > 1) {
        return {
          type: 'polyline',
          linecolor: color,
          linewidth: 4,
          lineopacity: 0.9,
          value: polylineCoords.map(([lon, lat]) => ({ lat, lon }))
        }
      }
      return {
        type: 'polyline',
        linecolor: color,
        linewidth: 3,
        lineopacity: 0.7,
        linestyle: 'dashed',
        value: [
          { lat: leg.origin_lat, lon: leg.origin_lon },
          { lat: leg.destination_lat, lon: leg.destination_lon }
        ]
      }
    })

  if (geometries.length === 0) return null

  try {
    const apiKey = process.env.GEOAPIFY_API_KEY
    if (!apiKey) {
      console.error('GEOAPIFY_API_KEY not set')
      return null
    }

    const res = await fetch(
      `https://maps.geoapify.com/v1/staticmap?apiKey=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'dark-matter',
          width,
          height,
          geometry: geometries,
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Geoapify error:', res.status, errorText)
      return null
    }
    
    const buf = await res.arrayBuffer()
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`
  } catch (error) {
    console.error('Map image fetch failed:', error)
    return null
  }
}
