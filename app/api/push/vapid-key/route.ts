import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

export async function GET() {
  return new NextResponse(getVapidPublicKey(), {
    headers: { 'Content-Type': 'text/plain' },
  })
}
