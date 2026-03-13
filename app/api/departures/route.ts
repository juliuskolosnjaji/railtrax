import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDepartures } from '@/lib/hafas'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const ibnr = req.nextUrl.searchParams.get('ibnr') ?? ''
  const when = req.nextUrl.searchParams.get('when') ?? ''

  if (!ibnr) return NextResponse.json({ error: 'validation_error', details: 'ibnr is required' }, { status: 422 })
  if (!when) return NextResponse.json({ error: 'validation_error', details: 'when is required' }, { status: 422 })

  const whenDate = new Date(when)
  if (isNaN(whenDate.getTime())) {
    return NextResponse.json({ error: 'validation_error', details: 'when must be a valid date' }, { status: 422 })
  }

  try {
    const departures = await getDepartures(ibnr, whenDate)
    return NextResponse.json({ data: departures })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
