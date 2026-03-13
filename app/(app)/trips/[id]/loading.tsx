import { Skeleton } from '@/components/ui/skeleton'

export default function TripDetailLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-3xl">
          {/* Back link */}
          <Skeleton className="h-4 w-20 bg-zinc-800 mb-6" />

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <Skeleton className="h-9 w-64 bg-zinc-800" />
            <Skeleton className="h-8 w-8 rounded-md bg-zinc-800 shrink-0" />
          </div>

          {/* Status + dates */}
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
            <Skeleton className="h-4 w-48 bg-zinc-800" />
          </div>

          {/* Map — same height as the real map to prevent CLS */}
          <Skeleton className="rounded-xl h-[250px] md:h-[400px] bg-zinc-800 mb-8" />

          {/* Legs header */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-16 bg-zinc-800" />
            <Skeleton className="h-8 w-20 rounded-md bg-zinc-800" />
          </div>

          {/* Leg skeletons */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
