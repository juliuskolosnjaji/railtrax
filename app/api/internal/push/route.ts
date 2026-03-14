import { NextRequest, NextResponse } from 'next/server'
import { sendToUser } from '@/lib/push'

const pushSchema = {
  parse: (body: unknown) => {
    const obj = body as { userId: string; title: string; body: string; url?: string }
    if (!obj.userId || !obj.title || !obj.body) {
      return { success: false as const, error: 'invalid_payload' }
    }
    return { success: true as const, data: obj }
  }
}

export async function POST(req: NextRequest) {
  const internalSecret = req.headers.get('X-Internal-Secret')
  if (internalSecret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = pushSchema.parse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 422 })
  }

  try {
    const result = await sendToUser(parsed.data.userId, {
      title: parsed.data.title,
      body: parsed.data.body,
      url: parsed.data.url,
    })
    return NextResponse.json({ success: true, ...result }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
