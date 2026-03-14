import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const subscribeSchema = {
  parse: (body: unknown) => {
    const obj = body as { endpoint: string; keys: { p256dh: string; auth: string } }
    if (!obj.endpoint || !obj.keys?.p256dh || !obj.keys?.auth) {
      return { success: false as const, error: 'invalid_payload' }
    }
    return { success: true as const, data: obj }
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = subscribeSchema.parse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 422 })
  }

  try {
    await prisma().pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      update: {
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
    })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
