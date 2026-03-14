import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchRouteMapImage } from '@/lib/export/mapImage'
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

  let qrBase64: string | null = null
  if (trip.shareToken) {
    const qrDataUrl = await QRCode.toDataURL(`https://railtrax.eu/trip/${trip.shareToken}`, {
      width: 120, margin: 1, color: { dark: '#4f8ef7', light: '#080d1a' }
    })
    qrBase64 = qrDataUrl
  }

  const totalKm = legs.reduce((s: number, l: any) => s + (Number(l.distanceKm) || 0), 0)
  const co2Saved = totalKm * 0.22
  const firstDep = legs[0]?.plannedDeparture
  const lastArr = legs[legs.length-1]?.plannedArrival
  const totalMins = firstDep && lastArr
    ? Math.round((new Date(lastArr).getTime() - new Date(firstDep).getTime()) / 60000)
    : 0
  const totalDuration = `${Math.floor(totalMins/60)}h ${totalMins%60}m`
  const shareUrl = trip.shareToken ? `railtrax.eu/trip/${trip.shareToken}` : null

  const buffer = await renderToBuffer(
    <TripDocument
      trip={trip}
      legs={legs}
      mapImageBase64={mapImage}
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
