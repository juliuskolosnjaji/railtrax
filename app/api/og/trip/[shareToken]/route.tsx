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

  const totalDistance = (trip.legs as { distance_km?: number }[]).reduce((sum: number, leg: { distance_km?: number }) => sum + (leg.distance_km || 0), 0)
  const legCount = trip.legs.length

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#E32228',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              R
            </div>
            <span
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1f2937',
              }}
            >
              Railtrax
            </span>
          </div>

          {/* Trip Title */}
          <h1
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '16px',
              lineHeight: '1.2',
            }}
          >
            {trip.title}
          </h1>

          {/* Description */}
          {trip.description && (
            <p
              style={{
                fontSize: '20px',
                color: '#6b7280',
                marginBottom: '40px',
                lineHeight: '1.5',
              }}
            >
              {trip.description.length > 100 
                ? trip.description.substring(0, 100) + '...' 
                : trip.description
              }
            </p>
          )}

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: '48px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '600',
                  color: '#1f2937',
                }}
              >
                {legCount}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}
              >
                {legCount === 1 ? 'Leg' : 'Legs'}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '600',
                  color: '#1f2937',
                }}
              >
                {totalDistance.toFixed(0)}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}
              >
                Kilometers
              </div>
            </div>
            {trip.start_date && trip.end_date && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: '600',
                    color: '#1f2937',
                  }}
                >
                  {Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    marginTop: '4px',
                  }}
                >
                  Days
                </div>
              </div>
            )}
          </div>

          {/* Date Range */}
          {trip.start_date && trip.end_date && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '18px',
                color: '#6b7280',
              }}
            >
              <span>{new Date(trip.start_date).toLocaleDateString()}</span>
              <span>→</span>
              <span>{new Date(trip.end_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}