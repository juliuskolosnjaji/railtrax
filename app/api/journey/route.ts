import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJourney } from '@/lib/hafas'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tripId = req.nextUrl.searchParams.get('tripId') ?? ''
  if (!tripId) {
    return NextResponse.json({ error: 'validation_error', details: 'tripId is required' }, { status: 422 })
  }

  try {
    const journey = await getJourney(tripId)
    return NextResponse.json({ data: journey })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
