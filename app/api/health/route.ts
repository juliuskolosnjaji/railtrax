import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    await supabase.from('users').select('count').limit(1)
    return NextResponse.json(
      { status: 'ok', ts: new Date().toISOString() },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
    )
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
