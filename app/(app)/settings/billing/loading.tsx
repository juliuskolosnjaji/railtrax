import { Skeleton } from '@/components/ui/skeleton'

export default function BillingLoading() {
  return (
    <div className="p-8 max-w-3xl">
      {/* Heading */}
      <Skeleton className="h-8 w-40 bg-zinc-800 mb-2" />
      <Skeleton className="h-4 w-64 bg-zinc-800 mb-8" />

      {/* Current plan card */}
      <Skeleton className="h-28 rounded-xl bg-zinc-800 mb-6" />

      {/* Usage section */}
      <Skeleton className="h-6 w-24 bg-zinc-800 mb-3" />
      <div className="space-y-3 mb-8">
        <Skeleton className="h-10 rounded-lg bg-zinc-800" />
        <Skeleton className="h-10 rounded-lg bg-zinc-800" />
      </div>

      {/* Plan cards */}
      <Skeleton className="h-6 w-32 bg-zinc-800 mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl bg-zinc-800" />
        <Skeleton className="h-64 rounded-xl bg-zinc-800" />
      </div>
    </div>
  )
}
