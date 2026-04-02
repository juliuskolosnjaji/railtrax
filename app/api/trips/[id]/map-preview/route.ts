import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchRouteMapImage } from '@/lib/export/mapImage'
import { generateFallbackMapPng } from '@/lib/export/fallbackMap'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const widthParam = Number(_req.nextUrl.searchParams.get('width') ?? '0')
    const heightParam = Number(_req.nextUrl.searchParams.get('height') ?? '0')
    const width = Number.isFinite(widthParam) && widthParam > 0 ? Math.min(Math.round(widthParam), 2400) : 600
    const height = Number.isFinite(heightParam) && heightParam > 0 ? Math.min(Math.round(heightParam), 2400) : 400

    const trip = await prisma().trip.findUnique({
      where: { id, userId: user.id },
      include: { legs: { orderBy: { position: 'asc' } } },
    })
    if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const legs = trip.legs
    const mapBase64 = await fetchRouteMapImage(
      legs.map((leg) => ({
        origin_lat: leg.originLat,
        origin_lon: leg.originLon,
        destination_lat: leg.destLat,
        destination_lon: leg.destLon,
        polyline: leg.polyline as [number, number][] | null,
        operator: leg.operator,
      })),
      width,
      height,
    )

    const fallbackBase64 = mapBase64 ?? await generateFallbackMapPng(
      legs.map((leg) => ({
        origin_lat: leg.originLat,
        origin_lon: leg.originLon,
        destination_lat: leg.destLat,
        destination_lon: leg.destLon,
        operator: leg.operator,
      })),
      width,
      height,
    )

    return NextResponse.json({ mapBase64: fallbackBase64 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
