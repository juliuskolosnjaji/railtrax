import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const IBNR_COUNTRY_MAP: Record<string, string> = {
  '80': 'DE',
  '85': 'AT',
  '88': 'CH',
  '87': 'FR',
}

function extractCountry(ibnr: string | null): string | null {
  if (!ibnr || ibnr.length < 2) return null
  return IBNR_COUNTRY_MAP[ibnr.slice(0, 2)] ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    type TripWithLegs = {
      legs: Array<{
        distanceKm: number | null
        plannedDeparture: Date
        plannedArrival: Date
        originIbnr: string | null
        destIbnr: string | null
        operator: string | null
      }>
    }
    
    const trips = await prisma().trip.findMany({
      where: {
        userId: user.id,
        status: { in: ['planned', 'active', 'completed'] },
      },
      include: {
        legs: {
          select: {
            distanceKm: true,
            plannedDeparture: true,
            plannedArrival: true,
            originIbnr: true,
            destIbnr: true,
            operator: true,
          },
        },
      },
    })

    let totalKm = 0
    let totalMinutes = 0
    const countryCodes = new Set<string>()
    const countryKm = new Map<string, number>()
    const operatorKm = new Map<string, number>()

    for (const trip of trips) {
      for (const leg of trip.legs) {
        const km = leg.distanceKm ?? 0
        totalKm += km
        totalMinutes += (leg.plannedArrival.getTime() - leg.plannedDeparture.getTime()) / 60000
        
        const originCountry = extractCountry(leg.originIbnr)
        const destCountry = extractCountry(leg.destIbnr)
        if (originCountry) {
          countryCodes.add(originCountry)
          countryKm.set(originCountry, (countryKm.get(originCountry) ?? 0) + km / 2)
        }
        if (destCountry) {
          countryCodes.add(destCountry)
          countryKm.set(destCountry, (countryKm.get(destCountry) ?? 0) + km / 2)
        }
        
        if (leg.operator) {
          operatorKm.set(leg.operator, (operatorKm.get(leg.operator) ?? 0) + km)
        }
      }
    }

    const totalLegs = trips.reduce((sum: number, trip: TripWithLegs) => sum + trip.legs.length, 0)

    const base = {
      total_km: Math.round(totalKm),
      total_trips: trips.length,
      total_legs: totalLegs,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
      countries: Array.from(countryCodes).sort(),
    }

    const monthlyDistances: Record<string, number> = {}
    for (const trip of trips) {
      for (const leg of trip.legs) {
        const monthKey = leg.plannedDeparture.toISOString().slice(0, 7)
        monthlyDistances[monthKey] = (monthlyDistances[monthKey] ?? 0) + (leg.distanceKm ?? 0)
      }
    }

    const topOperators = Array.from(operatorKm.entries())
      .map(([operator, km]) => ({ operator, km: Math.round(km) }))
      .sort((a, b) => b.km - a.km)
      .slice(0, 10)

    const countriesDetail = Array.from(countryKm.entries())
      .map(([country, km]) => ({ country, km: Math.round(km) }))
      .sort((a, b) => b.km - a.km)

    const co2_saved_kg = Math.round(totalKm * 0.22)

    return NextResponse.json(
      {
        data: {
          ...base,
          co2_saved_kg,
          monthly_distances: monthlyDistances,
          top_operators: topOperators,
          countries_detail: countriesDetail,
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
