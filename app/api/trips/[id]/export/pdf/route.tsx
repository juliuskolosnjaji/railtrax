import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchRouteMapImage } from '@/lib/export/mapImage'
import { generateFallbackMapSVG } from '@/lib/export/fallbackMap'
import { TripDocument } from '@/lib/export/TripDocument'

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

  // Fallback to SVG map if Geoapify fails
  let finalMapImage = mapImage
  if (!mapImage) {
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

  const totalKm = legs.reduce((s: number, l: any) => s + (Number(l.distanceKm) || 0), 0)
  
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
    ? `${(process.env.NEXT_PUBLIC_URL ?? 'https://railtrax.eu').replace(/\/+$/, '')}/trip/${trip.shareToken}`
    : null

  const buffer = await renderToBuffer(
    <TripDocument
      trip={trip}
      legs={legs}
      mapImageBase64={finalMapImage}
      totalKm={totalKm}
      totalDuration={totalDuration}
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
