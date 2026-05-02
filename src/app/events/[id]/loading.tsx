import { Skeleton } from '@/components/ui/skeleton'

export default function EventLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* EventHeader skeleton */}
      <div className="border-b border-brand-border pb-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 min-w-0 flex-1">
            {/* Event name */}
            <div className="space-y-1">
              <Skeleton className="h-9 w-2/3 max-w-sm" />
              {/* Gold accent line */}
              <Skeleton className="h-0.5 w-16 bg-gold/20" />
            </div>
            {/* Date */}
            <Skeleton className="h-4 w-48" />
            {/* Description */}
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-4 w-4/5 max-w-md" />
            {/* Media count */}
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-10 w-24 hidden md:block" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Gallery skeleton / empty state placeholder */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Skeleton className="h-16 w-16 rounded-full mb-5" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  )
}
