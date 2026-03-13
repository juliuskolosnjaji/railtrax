import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutUrl } from '@/lib/lemonsqueezy'

const VARIANT_MAP: Record<string, number> = {
  'plus-monthly': Number(process.env.LS_VARIANT_PLUS_MONTHLY),
  'plus-yearly': Number(process.env.LS_VARIANT_PLUS_YEARLY),
  'pro-monthly': Number(process.env.LS_VARIANT_PRO_MONTHLY),
  'pro-yearly': Number(process.env.LS_VARIANT_PRO_YEARLY),
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { plan } = body as { plan?: string }

  if (!plan || !VARIANT_MAP[plan]) {
    return NextResponse.json({ error: 'validation_error', details: 'Invalid plan' }, { status: 422 })
  }

  try {
    const url = await createCheckoutUrl(user.id, user.email!, VARIANT_MAP[plan])
    return NextResponse.json({ data: { url } })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
