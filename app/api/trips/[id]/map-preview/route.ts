import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.GEOAPIFY_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'map_unavailable' }, { status: 503 })

  try {
    const trip = await prisma().trip.findUnique({
      where: { id, userId: user.id },
      include: { legs: { orderBy: { position: 'asc' } } },
    })
    if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const legs = trip.legs

    // Build Geoapify static map POST body
    // Each leg contributes either its stored polyline or a straight line
    type GeoFeature = {
      type: 'Feature'
      geometry: { type: 'LineString'; coordinates: [number, number][] }
      properties: Record<string, unknown>
    }

    const features: GeoFeature[] = legs
      .map((leg): GeoFeature | null => {
        let coords: [number, number][] | null = null

        if (leg.polyline && Array.isArray(leg.polyline) && (leg.polyline as unknown[]).length >= 2) {
          coords = leg.polyline as [number, number][]
        } else if (
          leg.originLat != null && leg.originLon != null &&
          leg.destLat   != null && leg.destLon   != null
        ) {
          coords = [
            [leg.originLon, leg.originLat],
            [leg.destLon,   leg.destLat],
          ]
        }

        if (!coords) return null

        return {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {
            'stroke': '#4f8ef7',
            'stroke-width': 3,
            'stroke-opacity': 0.9,
          },
        }
      })
      .filter((f): f is GeoFeature => f !== null)

    if (features.length === 0) {
      return NextResponse.json({ mapBase64: null })
    }

    const geojson = { type: 'FeatureCollection', features }

    const body = {
      style: 'dark-matter',
      width: 600,
      height: 400,
      pitch: 0,
      zoom: 'auto',
      center: 'auto',
      geojson,
    }

    const res = await fetch(
      `https://maps.geoapify.com/v1/staticmap?apiKey=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      return NextResponse.json({ mapBase64: null })
    }

    const arrayBuffer = await res.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mapBase64 = `data:image/png;base64,${base64}`

    return NextResponse.json({ mapBase64 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
