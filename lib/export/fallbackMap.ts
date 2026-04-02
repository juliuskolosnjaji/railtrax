export type FallbackLeg = {
  origin_lat: number | null
  origin_lon: number | null
  destination_lat: number | null
  destination_lon: number | null
  operator?: string | null
}

export function buildFallbackMapSvgMarkup(
  legs: FallbackLeg[],
  width: number = 794,
  height: number = 280,
): string | null {
  const validLegs = legs.filter(
    (leg) =>
      leg.origin_lat != null &&
      leg.origin_lon != null &&
      leg.destination_lat != null &&
      leg.destination_lon != null,
  )
  if (validLegs.length === 0) return null

  // Calculate bounds
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180
  validLegs.forEach(leg => {
    if (leg.origin_lat != null && leg.origin_lon != null) {
      minLat = Math.min(minLat, leg.origin_lat)
      maxLat = Math.max(maxLat, leg.origin_lat)
      minLon = Math.min(minLon, leg.origin_lon)
      maxLon = Math.max(maxLon, leg.origin_lon)
    }
    if (leg.destination_lat != null && leg.destination_lon != null) {
      minLat = Math.min(minLat, leg.destination_lat)
      maxLat = Math.max(maxLat, leg.destination_lat)
      minLon = Math.min(minLon, leg.destination_lon)
      maxLon = Math.max(maxLon, leg.destination_lon)
    }
  })

  // Add padding
  const latPadding = (maxLat - minLat) * 0.1
  const lonPadding = (maxLon - minLon) * 0.1
  minLat -= latPadding
  maxLat += latPadding
  minLon -= lonPadding
  maxLon += lonPadding

  // Calculate scale
  const latRange = Math.max(maxLat - minLat, 0.0001)
  const lonRange = Math.max(maxLon - minLon, 0.0001)
  const scale = Math.min(width / lonRange, height / latRange) * 0.8

  // Convert coordinates to SVG coordinates
  const project = (lat: number, lon: number) => {
    const x = (lon - minLon) * scale + (width - lonRange * scale) / 2
    const y = (maxLat - lat) * scale + (height - latRange * scale) / 2
    return { x, y }
  }

  let paths = ''
  let markers = ''
  const stationSet = new Set<string>()

  validLegs.forEach((leg) => {
    const start = project(leg.origin_lat!, leg.origin_lon!)
    const end = project(leg.destination_lat!, leg.destination_lon!)

    const color = leg.operator === 'DB' ? '#E32228'
      : leg.operator === 'SBB' ? '#EB0000'
      : leg.operator === 'ÖBB' ? '#C8102E'
      : '#4f8ef7'

    paths += `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="3" stroke-linecap="round" />`

    const startKey = `${leg.origin_lat},${leg.origin_lon}`
    const endKey = `${leg.destination_lat},${leg.destination_lon}`

    if (!stationSet.has(startKey)) {
      markers += `<circle cx="${start.x}" cy="${start.y}" r="4" fill="#ffffff" stroke="${color}" stroke-width="2" />`
      stationSet.add(startKey)
    }

    if (!stationSet.has(endKey)) {
      markers += `<circle cx="${end.x}" cy="${end.y}" r="4" fill="#ffffff" stroke="${color}" stroke-width="2" />`
      stationSet.add(endKey)
    }
  })

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0a1628"/>
    <g>
      ${paths}
      ${markers}
    </g>
  </svg>`
}

export function generateFallbackMapSVG(
  legs: Array<{
    origin_lat: number | null
    origin_lon: number | null
    destination_lat: number | null
    destination_lon: number | null
    operator?: string | null
  }>,
  width: number = 794,
  height: number = 280
): string | null {
  const svg = buildFallbackMapSvgMarkup(legs, width, height)
  if (!svg) return null
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
