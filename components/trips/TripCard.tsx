import Link from 'next/link'
import { Calendar, Train } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { TripSummary } from '@/hooks/useTrips'

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-zinc-700 text-zinc-300',
  active: 'bg-blue-900 text-blue-200',
  completed: 'bg-emerald-900 text-emerald-200',
  cancelled: 'bg-red-900 text-red-300',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TripCard({ trip }: { trip: TripSummary }) {
  const start = formatDate(trip.startDate)
  const end = formatDate(trip.endDate)

  return (
    <Link href={`/trips/${trip.id}`} className="block group">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3 hover:border-zinc-600 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white group-hover:text-zinc-100 truncate">{trip.title}</h3>
          <Badge className={`shrink-0 text-xs ${STATUS_STYLES[trip.status ?? 'planned'] ?? STATUS_STYLES.planned}`}>
            {trip.status ?? 'planned'}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-zinc-500">
          {(start || end) && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {start && end ? `${start} → ${end}` : start ?? end}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Train className="h-3.5 w-3.5" />
            {trip._count.legs} {trip._count.legs === 1 ? 'leg' : 'legs'}
          </span>
        </div>
      </div>
    </Link>
  )
}
