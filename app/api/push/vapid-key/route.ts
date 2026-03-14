import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

export async function GET() {
  try {
    const publicKey = getVapidPublicKey()
    return new NextResponse(publicKey, {
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('VAPID_PUBLIC_KEY not configured')) {
      return NextResponse.json({ error: 'vapid_not_configured' }, { status: 503 })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
