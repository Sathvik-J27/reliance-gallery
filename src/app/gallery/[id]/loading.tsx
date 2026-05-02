import { Skeleton } from '@/components/ui/skeleton'

export default function GalleryEventLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back link */}
      <Skeleton className="h-4 w-24 mb-6 rounded" />

      {/* Event header */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="h-px bg-brand-border mt-6" />
      </div>

      {/* Filter bar skeleton */}
      <Skeleton className="h-20 w-full rounded-lg mb-5" />

      {/* Masonry skeleton — variable height rows */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
        {['h-44', 'h-60', 'h-40', 'h-52', 'h-56', 'h-44',
          'h-52', 'h-40', 'h-60', 'h-44', 'h-56', 'h-40'].map((h, i) => (
          <div key={i} className="break-inside-avoid mb-2">
            <div className={`w-full rounded-sm bg-gray-200 animate-pulse ${h}`} />
          </div>
        ))}
      </div>
    </main>
  )
}
