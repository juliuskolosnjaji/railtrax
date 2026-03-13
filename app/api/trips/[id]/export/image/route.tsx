/* eslint-disable @next/next/no-img-element */
import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

const OPERATOR_COLORS: Record<string, string> = {
  DB: '#e32228',
  SBB: '#e32228',
  OBB: '#e32228',
  OEBB: '#e32228',
  TGV: '#003399',
  SNCF: '#003399',
  Eurostar: '#ffd100',
  FLIX: '#6c5ce7',
  Flixtrain: '#6c5ce7',
  Westbahn: '#e32228',
}

function getOperatorColor(operator: string | null): string {
  if (!operator) return '#6b7280'
  const op = operator.toUpperCase()
  for (const key of Object.keys(OPERATOR_COLORS)) {
    if (op.includes(key.toUpperCase())) {
      return OPERATOR_COLORS[key]
    }
  }
  return '#6b7280'
}

async function fetchStaticMapImage(legs: Array<{ originLat: number | null; originLon: number | null; destLat: number | null; destLon: number | null }>): Promise<string | null> {
  const coords: [number, number][] = []
  
  for (const leg of legs) {
    if (leg.originLat && leg.originLon) coords.push([leg.originLon, leg.originLat])
    if (leg.destLat && leg.destLon) coords.push([leg.destLon, leg.destLat])
  }

  if (coords.length === 0) return null

  const lats = coords.map(c => c[1])
  const lons = coords.map(c => c[0])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2
  
  const latDiff = maxLat - minLat
  const lonDiff = maxLon - minLon
  const maxDiff = Math.max(latDiff, lonDiff)
  let zoom = 5
  if (maxDiff < 0.5) zoom = 8
  else if (maxDiff < 1) zoom = 7
  else if (maxDiff < 2) zoom = 6
  else if (maxDiff < 5) zoom = 5
  
  const markers = coords.map(c => `${c[1]},${c[0]}`).join('|')
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLon}&zoom=${zoom}&size=1200x378&markers=${encodeURIComponent(markers)}`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const contentType = res.headers.get('content-type') || 'image/png'
    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

function calculateTotalStats(legs: Array<{ distanceKm: number | null; originIbnr: string | null }>) {
  const totalKm = legs.reduce((sum, l) => sum + (l.distanceKm ?? 0), 0)
  const countries = new Set<string>()
  legs.forEach(l => {
    if (l.originIbnr) {
      const code = l.originIbnr.substring(0, 2)
      if (code >= '80' && code <= '99') countries.add(code)
    }
  })
  return { totalKm: Math.round(totalKm), countries: countries.size || 1 }
}

export async function GET(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    const shareToken = req.nextUrl.searchParams.get('token')
    if (shareToken) {
      const trip = await prisma.trip.findUnique({
        where: { shareToken, isPublic: true },
        include: { legs: { orderBy: { position: 'asc' } } },
      })
      if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })

      const { totalKm, countries } = calculateTotalStats(trip.legs)
      const mapImage = await fetchStaticMapImage(trip.legs)
      const operatorColor = getOperatorColor(trip.legs[0]?.operator ?? null)
      
      const startDate = trip.startDate 
        ? new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''
      const endDate = trip.endDate 
        ? new Date(trip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''
      const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : startDate

      try {
        const image = new ImageResponse(
          (
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#1a1a2e',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Map image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {mapImage ? (
                <img
                  src={mapImage}
                  alt="Trip map"
                  style={{
                    width: '100%',
                    height: '60%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '60%',
                    backgroundColor: '#2d2d4a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: 24,
                  }}
                >
                  Map unavailable
                </div>
              )}

              {/* Bottom strip */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 40px',
                  backgroundColor: '#1a1a2e',
                  position: 'relative',
                }}
              >
                {/* Operator color accent bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    backgroundColor: operatorColor,
                  }}
                />

                {/* Left side - title and date */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: 42,
                      fontWeight: 700,
                      color: '#ffffff',
                      lineHeight: 1.2,
                    }}
                  >
                    {trip.title}
                  </span>
                  {dateRange && (
                    <span
                      style={{
                        fontSize: 20,
                        color: '#9ca3af',
                        marginTop: 8,
                      }}
                    >
                      {dateRange}
                    </span>
                  )}
                </div>

                {/* Right side - stat pills */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      backgroundColor: '#2d2d4a',
                      borderRadius: 20,
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 600 }}>
                      {trip.legs.length}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 14, marginLeft: 6 }}>legs</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: '#2d2d4a',
                      borderRadius: 20,
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 600 }}>
                      {totalKm}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 14, marginLeft: 6 }}>km</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: '#2d2d4a',
                      borderRadius: 20,
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 600 }}>
                      {countries}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 14, marginLeft: 6 }}>countries</span>
                  </div>
                </div>

                {/* Railtripper wordmark */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 40,
                    color: '#6b7280',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  railtripper
                </div>
              </div>
            </div>
          ),
          {
            width: 1200,
            height: 630,
          }
        )

        const slugifiedTitle = trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        
        const arrayBuffer = await image.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="railtripper-${slugifiedTitle}.png"`,
          },
        })
      } catch (err) {
        console.error('Image export error:', err)
        return NextResponse.json({ error: 'internal_error' }, { status: 500 })
      }
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: { legs: { orderBy: { position: 'asc' } } },
    })

    if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (trip.userId !== user.id && !trip.isPublic) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { totalKm, countries } = calculateTotalStats(trip.legs)
    const mapImage = await fetchStaticMapImage(trip.legs)
    const operatorColor = getOperatorColor(trip.legs[0]?.operator ?? null)
    
    const startDate = trip.startDate 
      ? new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : ''
    const endDate = trip.endDate 
      ? new Date(trip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : ''
    const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : startDate

    try {
      const image = new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1a1a2e',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {mapImage ? (
              <img
                src={mapImage}
                alt="Trip map"
                style={{
                  width: '100%',
                  height: '60%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '60%',
                  backgroundColor: '#2d2d4a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: 24,
                }}
              >
                Map unavailable
              </div>
            )}

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 40px',
                backgroundColor: '#1a1a2e',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: operatorColor,
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.2,
                  }}
                >
                  {trip.title}
                </span>
                {dateRange && (
                  <span
                    style={{
                      fontSize: 20,
                      color: '#9ca3af',
                      marginTop: 8,
                    }}
                  >
                    {dateRange}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    backgroundColor: '#2d2d4a',
                    borderRadius: 20,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 600 }}>
                    {trip.legs.length}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: 14, marginLeft: 6 }}>legs</span>
                </div>
                <div
                  style={{
                    backgroundColor: '#2d2d4a',
                    borderRadius: 20,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 600 }}>
                    {totalKm}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: 14, marginLeft: 6 }}>km</span>
                </div>
                <div
                  style={{
                    backgroundColor: '#2d2d4a',
                    borderRadius: 20,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 600 }}>
                    {countries}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: 14, marginLeft: 6 }}>countries</span>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 40,
                  color: '#6b7280',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                railtripper
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )

      const slugifiedTitle = trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="railtripper-${slugifiedTitle}.png"`,
        },
      })
    } catch (err) {
      console.error('Image export error:', err)
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    }
  } catch (err) {
    console.error('Image export error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
