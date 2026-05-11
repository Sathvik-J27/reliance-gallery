'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { Camera, FilterX } from 'lucide-react'
import { useVisitorGalleryMedia } from '@/hooks/useVisitorGalleryMedia'
import { MediaTile } from './MediaTile'
import { GallerySkeleton } from './MediaSkeleton'
import { Lightbox } from './Lightbox'
import type { MediaWithUploader } from '@/app/actions/gallery'
import type { GalleryFilters } from '@/hooks/useGalleryMedia'

interface VisitorMediaGridProps {
  eventId: string
  filters?: GalleryFilters
  visitorLabel: string
}

export function VisitorMediaGrid({ eventId, filters, visitorLabel }: VisitorMediaGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useVisitorGalleryMedia(eventId, filters)

  const allMedia: MediaWithUploader[] = useMemo(
    () => data?.pages.flatMap((p) => p.media) ?? [],
    [data]
  )

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0, rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const hasActiveFilters = !!(
    filters?.fileType || filters?.uploaderId || filters?.dateFrom || filters?.dateTo
  )

  if (isLoading) return <GallerySkeleton />

  if (!allMedia.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 mb-5">
          {hasActiveFilters ? (
            <FilterX className="h-8 w-8 text-gold" />
          ) : (
            <Camera className="h-8 w-8 text-gold" />
          )}
        </div>
        <h3 className="font-playfair text-xl font-semibold text-brand-text mb-2">
          {hasActiveFilters ? 'No results' : 'No photos or videos yet'}
        </h3>
        <p className="font-inter text-sm text-gray-500 max-w-xs">
          {hasActiveFilters
            ? 'No media matches your current filters. Try adjusting or clearing them.'
            : 'This event has no media to display.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-4">
        <p className="font-inter text-sm text-gray-500">
          {allMedia.length}{hasNextPage ? '+' : ''} item{allMedia.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
        {allMedia.map((item, i) => (
          <MediaTile
            key={item.id}
            item={item}
            onClick={() => setSelectedIndex(i)}
            isFavorited={false}
            onToggleFavorite={() => {}}
            isAuthenticated={false}
            visitorLabel={visitorLabel}
            index={i}
          />
        ))}
      </div>

      {/* Scroll sentinel */}
      <div ref={sentinelRef} className="h-1 mt-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 rounded-full border-2 border-gold border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Lightbox ── */}
      {selectedIndex !== null && (
        <Lightbox
          media={allMedia}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          isFavorited={() => false}
          onToggleFavorite={() => {}}
          isAuthenticated={false}
          isVisitor={true}
          visitorLabel={visitorLabel}
          onReachEnd={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
        />
      )}
    </>
  )
}
