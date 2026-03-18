import { NextRequest, NextResponse } from 'next/server'
import { getTripById } from '@/lib/vendo'

const SCAN_HUBS = [
  '8000105', // Frankfurt Hbf
  '8011160', // Berlin Hbf
  '8000261', // München Hbf
  '8000091', // Hamburg Hbf
  '8000286', // Köln Hbf
  '8000155', // Düsseldorf Hbf
  '8000119', // Stuttgart Hbf
  '8000107', // Frankfurt Airport
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const dateStr = searchParams.get('date')
  
  // Default to current time
  const date = dateStr ? new Date(dateStr) : new Date()
  
  if (q.length < 2) return NextResponse.json({ data: [] })

  const normalized = q.toUpperCase().replace(/\s+/g,'')

  try {
    // Create fresh client for scanning
    const { createClient } = await import('db-vendo-client')
    const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js')
    const client = createClient(dbnavProfile, 'railtrax/1.0 (contact@railtrax.eu)')
    
    const results: Array<{
      tripId: string
      trainNumber: string
      operator: string | null
      origin: string | null
      destination: string | null
      departure: string | null
      delay: number
      station: string
    }> = []

    for (const hubId of SCAN_HUBS) {
      try {
        const { departures } = await client.departures(hubId, {
          when: date,
          duration: 180,
          results: 60,
        })
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matches = (departures as any[]).filter((dep: any) => {
          if (!dep.tripId || dep.cancelled) return false
          const lineName = (dep.line?.name ?? '').replace(/\s+/g, '').toUpperCase()
          return lineName.includes(normalized.replace(/\s+/g, ''))
        })

        for (const dep of matches.slice(0, 3)) {
          if (!results.find(r => r.tripId === dep.tripId)) {
            results.push({
              tripId: dep.tripId,
              trainNumber: dep.line?.name ?? q,
              operator: null,
              origin: hubId === '8000105' ? 'Frankfurt Hbf' : 
                      hubId === '8011160' ? 'Berlin Hbf' :
                      hubId === '8000261' ? 'München Hbf' :
                      hubId === '8000091' ? 'Hamburg Hbf' :
                      hubId === '8000286' ? 'Köln Hbf' :
                      hubId === '8000155' ? 'Düsseldorf Hbf' :
                      hubId === '8000119' ? 'Stuttgart Hbf' :
                      hubId === '8000107' ? 'Frankfurt Airport' : 'Unknown',
              destination: dep.direction,
              departure: dep.plannedWhen,
              delay: dep.delay ?? 0,
              station: hubId,
            })
          }
        }

        if (results.length >= 10) break
      } catch (e) {
        console.error(`Error scanning ${hubId}:`, e)
      }
    }

    return NextResponse.json({ data: results.slice(0, 10) })
  } catch (err) {
    console.error('Train search error:', err)
    return NextResponse.json(
      { error: 'Fehler bei der Zugsuche' },
      { status: 500 }
    )
  }
}
