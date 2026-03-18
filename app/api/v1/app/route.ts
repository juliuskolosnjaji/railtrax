/**
 * GET /api/v1/app/config — app configuration (public, no auth)
 * Returns version, feature flags, and server info for mobile clients.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      data: {
        version: process.env.npm_package_version ?? '1.0.0',
        apiVersion: 'v1',
        features: {
          traewelling: true,
          rollingStock: true,
          reviews: true,
          pushNotifications: !!process.env.VAPID_PUBLIC_KEY,
          stats: true,
        },
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
        supportEmail: 'support@railtrax.eu',
      },
    },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
  )
}
