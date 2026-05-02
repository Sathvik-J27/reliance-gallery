import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <Skeleton className="h-10 w-44 mb-3" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 mb-8 border-b border-brand-border pb-0">
        <Skeleton className="h-10 w-24 rounded-none rounded-t-lg" />
        <Skeleton className="h-10 w-32 rounded-none rounded-t-lg" />
        <Skeleton className="h-10 w-28 rounded-none rounded-t-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Top uploaders */}
      <Skeleton className="h-48 rounded-xl" />
    </main>
  )
}
