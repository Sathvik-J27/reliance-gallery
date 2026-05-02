import { GallerySkeleton } from '@/components/gallery/MediaSkeleton'

export default function FavoritesLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2 ml-0">
          <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-8 w-44 bg-gray-100 animate-pulse rounded" />
        </div>
        <div className="h-4 w-64 bg-gray-100 animate-pulse rounded ml-11" />
      </div>
      <div className="h-px bg-gray-100 mb-8" />
      <GallerySkeleton />
    </main>
  )
}
