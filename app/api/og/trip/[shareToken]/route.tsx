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

   const { data: trip, error: tripError } = await supabase
     .from('trips')
     .select('title, description, start_date, end_date, legs(distance_km)')
     .eq('share_token', shareToken)
     .eq('is_public', true)
     .single()

   if (tripError || !trip) {
     return new Response('Trip not found', { status: 404 })
   }

  const totalDistance = (trip.legs as { distance_km?: number }[]).reduce(
    (sum: number, leg: { distance_km?: number }) => sum + (leg.distance_km || 0),
    0
  )
  const legCount = trip.legs.length

  const dateRange = trip.start_date && trip.end_date
    ? `${new Date(trip.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} – ${new Date(trip.end_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : null

  const titleFontSize = trip.title.length > 30 ? '52px' : '62px'

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
        {/* Accent top bar */}
        <div style={{ display: 'flex', height: 5, backgroundColor: '#4f8ef7' }} />

        {/* Main content — full height, content-first */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            padding: '48px 64px',
          }}
        >
          {/* Railtrax micro brand — small, top-left, unobtrusive */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="1" y1="12" x2="23" y2="12" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="1" y1="16" x2="23" y2="16" stroke="#1e3a6e" strokeWidth="1" strokeDasharray="3 3"/>
              <circle cx="5"  cy="12" r="3"   fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="5"  cy="12" r="1.5" fill="#4f8ef7"/>
              <circle cx="12" cy="12" r="2.5" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="1"   fill="#4f8ef7"/>
              <circle cx="19" cy="12" r="3"   fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
              <circle cx="19" cy="12" r="1.5" fill="#4f8ef7"/>
            </svg>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#4a6a9a', letterSpacing: '0.05em' }}>
              Railtrax
            </span>
          </div>

          {/* Trip title */}
          <h1
            style={{
              fontSize: titleFontSize,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: 12,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {trip.title}
          </h1>

          {/* Description */}
          {trip.description && (
            <p style={{ fontSize: 22, color: '#8ba3c7', marginBottom: 36, lineHeight: 1.4, maxWidth: 800 }}>
              {trip.description.length > 140
                ? trip.description.substring(0, 140) + '…'
                : trip.description}
            </p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 52, borderRight: '1px solid #1e2d4a' }}>
              <span style={{ fontSize: 11, color: '#4a6a9a', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>ABSCHNITTE</span>
              <span style={{ fontSize: 42, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{legCount}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 52, paddingRight: 52, borderRight: dateRange ? '1px solid #1e2d4a' : 'none' }}>
              <span style={{ fontSize: 11, color: '#4a6a9a', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>STRECKE</span>
              <span style={{ fontSize: 42, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{totalDistance.toFixed(0)} km</span>
            </div>
            {dateRange && (
              <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 52 }}>
                <span style={{ fontSize: 11, color: '#4a6a9a', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>ZEITRAUM</span>
                <span style={{ fontSize: 26, fontWeight: 600, color: '#8ba3c7', lineHeight: 1 }}>
                  {dateRange}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom strip — minimal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 64px',
            background: '#0d1f3c',
            borderTop: '1px solid #1e3a6e',
          }}
        >
          <span style={{ color: '#4f8ef7', fontSize: 14, fontWeight: 500 }}>
            railtrax.eu
          </span>
          <span style={{ color: '#4a6a9a', fontSize: 12 }}>
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
