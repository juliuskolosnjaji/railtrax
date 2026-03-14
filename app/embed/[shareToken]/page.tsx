import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-200 animate-pulse" /> },
)

interface PageProps {
  params: { shareToken: string }
}

export default async function EmbedPage({ params }: PageProps) {
  const supabase = createClient()
  
  const { data: trip } = await supabase
    .from('trips')
    .select(`
      *,
      legs(*)
    `)
    .eq('share_token', params.shareToken)
    .eq('is_public', true)
    .single()

  if (!trip) {
    notFound()
  }

  type EmbedLeg = { id: string; planned_departure: string; planned_arrival: string; origin_name?: string; dest_name?: string; train_type?: string; train_number?: string; operator?: string; [key: string]: unknown }
  const legs = (trip.legs as EmbedLeg[]).sort((a, b) =>
    new Date(a.planned_departure).getTime() - new Date(b.planned_departure).getTime()
  )

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Map */}
      <div className="flex-1 relative">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <TripMap legs={legs as any} />
      </div>
      
      {/* Leg List */}
      <div className="h-64 border-t bg-white overflow-y-auto">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">{trip.title}</h3>
          <div className="space-y-3">
            {legs.map((leg: EmbedLeg, index: number) => (
              <div key={leg.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold text-xs">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{leg.origin_name}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium">{leg.dest_name}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}