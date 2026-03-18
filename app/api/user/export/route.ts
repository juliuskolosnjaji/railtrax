import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const db = prisma()

    const [profile, trips, journalEntries, usageCounter] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: {
          email: true,
          username: true,
          displayName: true,
          homeStation: true,
          createdAt: true,
        },
      }),
      db.trip.findMany({
        where: { userId: user.id },
        include: {
          legs: {
            include: { rollingStock: true },
            orderBy: { plannedDeparture: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.journalEntry.findMany({
        where: { userId: user.id },
        include: { photos: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.usageCounter.findUnique({ where: { userId: user.id } }),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      note: 'Railtrax Datenexport gemäß DSGVO Art. 20 (Datenübertragbarkeit)',
      profile: {
        email: profile?.email,
        username: profile?.username,
        display_name: profile?.displayName,
        home_station: profile?.homeStation,
        created_at: profile?.createdAt,
        plan: user.app_metadata?.plan ?? 'free',
      },
      trips,
      journal_entries: journalEntries,
      usage: usageCounter
        ? {
            trips_count: usageCounter.tripsCount,
            legs_count: usageCounter.legsCount,
            photos_count: usageCounter.photosCount,
          }
        : null,
    }

    const filename = `railtrax-export-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
