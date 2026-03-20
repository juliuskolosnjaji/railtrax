import Link from 'next/link'
import { Calendar, Train } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { TripSummary } from '@/hooks/useTrips'

const STATUS_STYLES: Record<string, string> = {
  planned:   'bg-secondary text-secondary-foreground',
  active:    'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
}

const STATUS_LABELS: Record<string, string> = {
  planned:   'Geplant',
  active:    'Aktiv',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TripCard({ trip }: { trip: TripSummary }) {
  const start = formatDate(trip.startDate)
  const end = formatDate(trip.endDate)

  return (
    <Link href={`/trips/${trip.id}`} className="block group">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-border/60 hover:bg-secondary/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground truncate">{trip.title}</h3>
          <Badge className={`shrink-0 text-xs ${STATUS_STYLES[trip.status ?? 'planned'] ?? STATUS_STYLES.planned}`}>
            {STATUS_LABELS[trip.status ?? 'planned'] ?? 'Geplant'}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {(start || end) && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {start && end ? `${start} → ${end}` : start ?? end}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Train className="h-3.5 w-3.5" />
            {trip._count.legs} {trip._count.legs === 1 ? 'Abschnitt' : 'Abschnitte'}
          </span>
        </div>
      </div>
    </Link>
  )
}
