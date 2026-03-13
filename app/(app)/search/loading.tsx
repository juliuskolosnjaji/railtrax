import { Skeleton } from '@/components/ui/skeleton'

export default function SearchLoading() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 space-y-1.5">
        <Skeleton className="h-8 w-52 bg-zinc-800" />
        <Skeleton className="h-4 w-72 bg-zinc-800" />
      </div>

      {/* Form skeleton */}
      <Skeleton className="h-36 rounded-xl bg-zinc-800" />

      {/* Result skeletons */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl bg-zinc-800" />
        ))}
      </div>
    </div>
  )
}
