import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  const supabase = await createClient()

  const { data: trip } = await supabase
    .from('trips')
    .select('title, description, start_date, end_date, legs(distance_km)')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single()

  if (!trip) {
    return new Response('Trip not found', { status: 404 })
  }

  const totalDistance = (trip.legs as { distance_km?: number }[]).reduce(
    (sum: number, leg: { distance_km?: number }) => sum + (leg.distance_km || 0),
    0
  )
  const legCount = trip.legs.length

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#080d1a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top brand strip */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '40px 60px 0', gap: 14 }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <line x1="1" y1="12" x2="23" y2="12" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="1" y1="16" x2="23" y2="16" stroke="#1e3a6e" strokeWidth="1" strokeDasharray="3 3"/>
              <circle cx="5"  cy="12" r="3"   fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="5"  cy="12" r="1.5" fill="#4f8ef7"/>
              <circle cx="12" cy="12" r="2.5" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="1"   fill="#4f8ef7"/>
              <circle cx="19" cy="12" r="3"   fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="19" cy="12" r="1.5" fill="#4f8ef7"/>
            </svg>
            <span style={{ fontSize: 20, fontWeight: 500, color: '#ffffff', letterSpacing: '-0.3px' }}>
              Railtrax
            </span>
          </div>
          <span style={{ color: '#1e2d4a', fontSize: 18, marginLeft: 8 }}>|</span>
          <span style={{ color: '#4a6a9a', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Shared Trip
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            padding: '40px 60px',
          }}
        >
          {/* Trip title */}
          <h1
            style={{
              fontSize: trip.title.length > 30 ? '44px' : '56px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 16,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            {trip.title}
          </h1>

          {/* Description */}
          {trip.description && (
            <p style={{ fontSize: 20, color: '#8ba3c7', marginBottom: 48, lineHeight: 1.5, maxWidth: 700 }}>
              {trip.description.length > 120
                ? trip.description.substring(0, 120) + '…'
                : trip.description}
            </p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 48, borderRight: '1px solid #1e2d4a' }}>
              <span style={{ fontSize: 11, color: '#4a6a9a', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>ABSCHNITTE</span>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#ffffff' }}>{legCount}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 48, paddingRight: 48, borderRight: trip.start_date ? '1px solid #1e2d4a' : 'none' }}>
              <span style={{ fontSize: 11, color: '#4a6a9a', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>STRECKE</span>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#ffffff' }}>{totalDistance.toFixed(0)} km</span>
            </div>
            {trip.start_date && trip.end_date && (
              <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 48 }}>
                <span style={{ fontSize: 11, color: '#4a6a9a', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>ZEITRAUM</span>
                <span style={{ fontSize: 24, fontWeight: 600, color: '#8ba3c7' }}>
                  {new Date(trip.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                  {' → '}
                  {new Date(trip.end_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 60px',
            background: '#0d1f3c',
            borderTop: '1px solid #1e3a6e',
          }}
        >
          <span style={{ color: '#4f8ef7', fontSize: 14, fontWeight: 500 }}>
            railtrax.app
          </span>
          <span style={{ color: '#4a6a9a', fontSize: 13 }}>
            European Rail Planner
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
