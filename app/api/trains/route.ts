import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJourneyByTrainNumber } from '@/lib/hafas'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const number = req.nextUrl.searchParams.get('number') ?? ''
  const date = req.nextUrl.searchParams.get('date') ?? ''

  if (!number) {
    return NextResponse.json({ error: 'validation_error', details: 'number is required' }, { status: 422 })
  }
  if (!date) {
    return NextResponse.json({ error: 'validation_error', details: 'date is required' }, { status: 422 })
  }

  // Validate YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return NextResponse.json({ error: 'validation_error', details: 'date must be YYYY-MM-DD' }, { status: 422 })
  }

  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'validation_error', details: 'date is invalid' }, { status: 422 })
  }

  try {
    const journey = await getJourneyByTrainNumber(number, parsedDate)
    if (!journey) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ data: journey })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
