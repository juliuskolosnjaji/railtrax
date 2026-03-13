import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { renderToStream } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { TripPdfDocument } from '@/lib/export/tripPdf'

type Params = { params: { id: string } }

type LegCoords = {
  originLat: number | null
  originLon: number | null
  destLat: number | null
  destLon: number | null
  polyline: unknown
}

async function fetchStaticMapImage(legs: LegCoords[]): Promise<string | null> {
  const coords: [number, number][] = []
  
  for (const leg of legs) {
    if (leg.originLat && leg.originLon) coords.push([leg.originLon, leg.originLat])
    if (leg.destLat && leg.destLon) coords.push([leg.destLon, leg.destLat])
    const polyline = leg.polyline as [number, number][] | null | undefined
    if (polyline) {
      for (const point of polyline) {
        if (point[0] !== null && point[1] !== null) coords.push([point[0], point[1]])
      }
    }
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
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLon}&zoom=${zoom}&size=600x300&markers=${encodeURIComponent(markers)}`

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

async function generateQRCode(url: string): Promise<string | null> {
  try {
    const buffer = await QRCode.toBuffer(url, { width: 100, margin: 1 })
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
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
      
      const mapImage = await fetchStaticMapImage(trip.legs)
      const publicUrl = `${process.env.NEXT_PUBLIC_URL || 'https://railtripper.app'}/share/${trip.shareToken}`
      const qrCodeImage = await generateQRCode(publicUrl)
      
      const stream = await renderToStream(
        <TripPdfDocument
          trip={{
            title: trip.title,
            startDate: trip.startDate?.toISOString() ?? null,
            endDate: trip.endDate?.toISOString() ?? null,
            isPublic: trip.isPublic,
            shareToken: trip.shareToken,
            legs: trip.legs.map(l => ({
              id: l.id,
              plannedDeparture: l.plannedDeparture.toISOString(),
              plannedArrival: l.plannedArrival.toISOString(),
              originName: l.originName,
              destName: l.destName,
              operator: l.operator,
              trainType: l.trainType,
              trainNumber: l.trainNumber,
              delayMinutes: l.delayMinutes,
              cancelled: l.cancelled,
              platformPlanned: l.platformPlanned,
              seat: l.seat,
              distanceKm: l.distanceKm,
              originIbnr: l.originIbnr,
            })),
          }}
          mapImage={mapImage}
          qrCodeImage={qrCodeImage}
          generatedAt={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        />
      )

      const slugifiedTitle = trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      return new NextResponse(stream as unknown as ReadableStream<Uint8Array>, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="railtripper-${slugifiedTitle}.pdf"`,
        },
      })
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

    const mapImage = await fetchStaticMapImage(trip.legs)
    const publicUrl = trip.isPublic && trip.shareToken 
      ? `${process.env.NEXT_PUBLIC_URL || 'https://railtripper.app'}/share/${trip.shareToken}`
      : null
    const qrCodeImage = publicUrl ? await generateQRCode(publicUrl) : null

    const stream = await renderToStream(
      <TripPdfDocument
        trip={{
          title: trip.title,
          startDate: trip.startDate?.toISOString() ?? null,
          endDate: trip.endDate?.toISOString() ?? null,
          isPublic: trip.isPublic,
          shareToken: trip.shareToken,
          legs: trip.legs.map(l => ({
            id: l.id,
            plannedDeparture: l.plannedDeparture.toISOString(),
            plannedArrival: l.plannedArrival.toISOString(),
            originName: l.originName,
            destName: l.destName,
            operator: l.operator,
            trainType: l.trainType,
            trainNumber: l.trainNumber,
            delayMinutes: l.delayMinutes,
            cancelled: l.cancelled,
            platformPlanned: l.platformPlanned,
            seat: l.seat,
            distanceKm: l.distanceKm,
            originIbnr: l.originIbnr,
          })),
        }}
        mapImage={mapImage}
        qrCodeImage={qrCodeImage}
        generatedAt={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      />
    )

    const slugifiedTitle = trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    return new NextResponse(stream as unknown as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="railtripper-${slugifiedTitle}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF export error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
