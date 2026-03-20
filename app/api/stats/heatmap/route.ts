import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/redis'

interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  properties: {
    origin: string
    destination: string
    operator: string | null
    distanceKm: number | null
  }
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const cacheKey = `heatmap:${user.id}`

  try {
    const geojson = await cached<GeoJSONFeatureCollection>(
      cacheKey,
      3600,
      async () => {
        const legs = await prisma().leg.findMany({
          where: {
            trip: { userId: user.id },
            status: 'completed',
          },
          select: {
            originName: true,
            destName: true,
            operator: true,
            distanceKm: true,
            polyline: true,
          },
        })

        const features: GeoJSONFeature[] = []

        for (const leg of legs) {
          if (!leg.polyline) continue
          const poly = leg.polyline as unknown as [number, number][]
          if (!Array.isArray(poly) || poly.length < 2) continue

          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: poly,
            },
            properties: {
              origin: leg.originName,
              destination: leg.destName,
              operator: leg.operator,
              distanceKm: leg.distanceKm,
            },
          })
        }

        return { type: 'FeatureCollection', features }
      }
    )

    return NextResponse.json({ data: geojson })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
