import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchRouteMapImage } from '@/lib/export/mapImage'
import { generateFallbackMapSVG } from '@/lib/export/fallbackMap'
import { TripDocument } from '@/lib/export/TripDocument'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip: any = await prisma().trip.findUnique({
    where: { id },
    include: { 
      legs: {
        select: {
          id: true,
          originName: true,
          originIbnr: true,
          originLat: true,
          originLon: true,
          destName: true,
          destIbnr: true,
          destLat: true,
          destLon: true,
          plannedDeparture: true,
          plannedArrival: true,
          actualDeparture: true,
          actualArrival: true,
          operator: true,
          trainNumber: true,
          lineName: true,
          distanceKm: true,
          platformPlanned: true,
          seat: true,
          polyline: true,
          rollingStock: true
        },
        orderBy: { plannedDeparture: 'asc' }
      }
    }
  })
  if (!trip || trip.userId !== user.id) return new Response('Not found', { status: 404 })

  const legs = trip.legs

  // DEBUG LOGGING - Add this to check data issues
  console.log('=== PDF EXPORT DEBUG ===')
  console.log('Trip:', JSON.stringify({ 
    id: trip.id, 
    title: trip.title, 
    created_at: trip.createdAt,
    legs_count: legs.length 
  }))
  console.log('Legs count:', legs.length)
  if (legs[0]) {
    console.log('First leg raw:', JSON.stringify({
      origin_name: legs[0].originName,
      destination_name: legs[0].destinationName,
      planned_departure: legs[0].plannedDeparture,
      planned_arrival: legs[0].plannedArrival,
      distance_km: legs[0].distanceKm,
      origin_lat: legs[0].originLat,
      origin_lon: legs[0].originLon,
      destination_lat: legs[0].destLat,
      destination_lon: legs[0].destLon,
      operator: legs[0].operator,
      train_number: legs[0].trainNumber,
      polyline: legs[0].polyline,
    }))
  }

  const mapImage = await fetchRouteMapImage(
    legs.map((l: any) => ({
      origin_lat: l.originLat,
      origin_lon: l.originLon,
      destination_lat: l.destLat,
      destination_lon: l.destLon,
      polyline: l.polyline,
      operator: l.operator,
    })),
    794,
    280
  )

  console.log('Map fetch result:', mapImage ? 'SUCCESS' : 'FAILED')
  
  // Fallback to SVG map if Geoapify fails
  let finalMapImage = mapImage
  if (!mapImage) {
    console.log('Using fallback SVG map...')
    const fallbackMap = generateFallbackMapSVG(
      legs.map((l: any) => ({
        origin_lat: l.originLat,
        origin_lon: l.originLon,
        destination_lat: l.destLat,
        destination_lon: l.destLon,
        operator: l.operator,
      })),
      794,
      280
    )
    finalMapImage = fallbackMap
  }
  
  console.log('=== END PDF EXPORT DEBUG ===')

  let qrBase64: string | null = null
  if (trip.shareToken) {
    const qrDataUrl = await QRCode.toDataURL(`https://railtrax.eu/trip/${trip.shareToken}`, {
      width: 120, margin: 1, color: { dark: '#4f8ef7', light: '#080d1a' }
    })
    qrBase64 = qrDataUrl
  }

  const totalKm = legs.reduce((s: number, l: any) => s + (Number(l.distanceKm) || 0), 0)
  const co2Saved = totalKm * 0.22
  
  // Fix total duration calculation with null checks
  const legsWithValidDates = legs.filter((l: any) => 
    l.plannedDeparture && !isNaN(new Date(l.plannedDeparture).getTime())
  )
  const firstDep = legsWithValidDates[0]?.plannedDeparture
  const lastArr = legsWithValidDates.length > 0 
    ? [...legsWithValidDates].reverse().find((l: any) => l.plannedArrival)?.plannedArrival 
      ?? [...legsWithValidDates].reverse().find((l: any) => l.plannedDeparture)?.plannedDeparture
    : null
  
  let totalDuration = 'Dauer unbekannt'
  if (firstDep && lastArr) {
    const d1 = new Date(firstDep)
    const d2 = new Date(lastArr)
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const totalMins = Math.round((d2.getTime() - d1.getTime()) / 60000)
      totalDuration = `${Math.floor(totalMins/60)}h ${totalMins%60}m`
    }
  }
  const shareUrl = trip.shareToken 
    ? `${process.env.NEXT_PUBLIC_URL}/trip/${trip.shareToken}` 
    : null

  const buffer = await renderToBuffer(
    <TripDocument
      trip={trip}
      legs={legs}
      mapImageBase64={finalMapImage}
      qrBase64={qrBase64}
      totalKm={totalKm}
      totalDuration={totalDuration}
      co2Saved={co2Saved}
      shareUrl={shareUrl}
    />
  )

  const slug = trip.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="railtrax-${slug}.pdf"`,
    }
  })
}
