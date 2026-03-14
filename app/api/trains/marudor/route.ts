import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarudorTrainInfo } from '@/lib/marudor'

// GET /api/trains/marudor?number=521&departure=2026-03-14T08:30:00Z
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const number = searchParams.get('number')
  const departureStr = searchParams.get('departure')

  if (!number || !departureStr) {
    return NextResponse.json({ error: 'validation_error', details: 'number and departure required' }, { status: 422 })
  }

  const departure = new Date(departureStr)
  if (isNaN(departure.getTime())) {
    return NextResponse.json({ error: 'validation_error', details: 'invalid departure date' }, { status: 422 })
  }

  const result = await getMarudorTrainInfo(number, departure)

  return NextResponse.json({ data: result })
}
