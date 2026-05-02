import { Skeleton } from '@/components/ui/skeleton'

function SkeletonCard() {
  return (
    <div className="bg-white border border-brand-border rounded-xl shadow-sm overflow-hidden">
      {/* Cover image skeleton */}
      <Skeleton className="aspect-video w-full rounded-none" />

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Event name */}
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
        {/* Badge */}
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page heading skeleton */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-64 max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Grid of 6 skeleton cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
