import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Train, Clock } from 'lucide-react'
import Link from 'next/link'

const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" /> },
)

interface PageProps {
  params: { shareToken: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient()
  
  const { data: trip } = await supabase
    .from('trips')
    .select('title, description, start_date, end_date, user_id')
    .eq('share_token', params.shareToken)
    .eq('is_public', true)
    .single()

  if (!trip) {
    return {
      title: 'Trip not found',
    }
  }

  // Get username for the trip
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', trip.user_id)
    .single()

  const dateRange = trip.start_date && trip.end_date 
    ? `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
    : ''

  return {
    title: `${trip.title} - Railtripper`,
    description: trip.description || `A train journey by ${user?.username || 'a traveler'}${dateRange ? ` from ${dateRange}` : ''}`,
    openGraph: {
      title: trip.title,
      description: trip.description || `A train journey by ${user?.username || 'a traveler'}${dateRange ? ` from ${dateRange}` : ''}`,
      images: [`/api/og/trip/${params.shareToken}`],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: trip.title,
      description: trip.description || `A train journey by ${user?.username || 'a traveler'}${dateRange ? ` from ${dateRange}` : ''}`,
      images: [`/api/og/trip/${params.shareToken}`],
    },
  }
}

export default async function PublicTripPage({ params }: PageProps) {
  const supabase = createClient()
  
  const { data: trip } = await supabase
    .from('trips')
    .select(`
      *,
      legs(*),
      user:users(username, display_name)
    `)
    .eq('share_token', params.shareToken)
    .eq('is_public', true)
    .single()

  if (!trip) {
    notFound()
  }

  type TripLeg = { id: string; planned_departure: string; planned_arrival: string; distance_km?: number; origin_name?: string; dest_name?: string; train_type?: string; train_number?: string; operator?: string }
  const legs = (trip.legs as TripLeg[]).sort((a, b) =>
    new Date(a.planned_departure).getTime() - new Date(b.planned_departure).getTime()
  )

  const totalDistance = legs.reduce((sum: number, leg: TripLeg) => sum + (leg.distance_km || 0), 0)
  const totalDuration = legs.reduce((sum: number, leg: TripLeg) => {
    const duration = new Date(leg.planned_arrival).getTime() - new Date(leg.planned_departure).getTime()
    return sum + duration
  }, 0)

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold text-red-600">
                Railtripper
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Shared Trip</span>
            </div>
            <Link href="/signup">
              <Button className="bg-red-600 hover:bg-red-700">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trip Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{trip.title}</h1>
              
              {trip.description && (
                <p className="text-gray-600 mb-4">{trip.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {trip.start_date && trip.end_date
                      ? `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`
                      : 'No dates specified'
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Train className="w-4 h-4" />
                  <span>{legs.length} leg{legs.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{totalDistance.toFixed(0)} km total</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(totalDuration)} total</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>by</span>
                  <span className="font-medium">{trip.user?.display_name || trip.user?.username || 'Anonymous'}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <Link href="/signup">
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Plan your own trip
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="h-96 relative">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <TripMap legs={legs as any} />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Journey Timeline</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {legs.map((leg: TripLeg, index: number) => (
                  <div key={leg.id} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {leg.origin_name}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-gray-900">
                            {leg.dest_name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTime(leg.planned_departure)} - {formatTime(leg.planned_arrival)}
                          {leg.train_type && leg.train_number && (
                            <span className="ml-2">
                              {leg.train_type} {leg.train_number}
                            </span>
                          )}
                          {leg.operator && (
                            <span className="ml-2">
                              • {leg.operator}
                            </span>
                          )}
                        </div>
                        {leg.distance_km && (
                          <div className="text-sm text-gray-500 mt-1">
                            {leg.distance_km.toFixed(0)} km
                          </div>
                        )}
                      </div>
                    </div>
                    {index < legs.length - 1 && (
                      <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-200" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}