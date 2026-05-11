'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { Camera, FilterX, CheckSquare, Trash2, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useGalleryMedia } from '@/hooks/useGalleryMedia'
import { useEventFavorites } from '@/hooks/useFavorites'
import { deleteMediaBatch } from '@/app/actions/media'
import { MediaTile } from './MediaTile'
import { GallerySkeleton } from './MediaSkeleton'
import { Lightbox } from './Lightbox'
import type { MediaWithUploader } from '@/app/actions/media'
import type { GalleryFilters } from '@/hooks/useGalleryMedia'

interface MediaGridProps {
  eventId: string
  isAuthenticated: boolean
  isAdmin?: boolean
  filters?: GalleryFilters
}

export function MediaGrid({ eventId, isAuthenticated, isAdmin = false, filters }: MediaGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGalleryMedia(eventId, filters)

  const { favoriteSet, toggleFavorite } = useEventFavorites(eventId, isAuthenticated)

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

  // Exit select mode when filters change
  useEffect(() => {
    setIsSelectMode(false)
    setSelectedIds(new Set())
  }, [filters])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setIsSelectMode(false)
    setSelectedIds(new Set())
    setDeleteError(null)
  }

  async function handleDeleteSelected() {
    const count = selectedIds.size
    if (!count) return
    if (!confirm(`Permanently delete ${count} item${count > 1 ? 's' : ''}? This cannot be undone.`)) return

    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteMediaBatch(Array.from(selectedIds))
    setIsDeleting(false)

    if (result.error) {
      setDeleteError(result.error)
      return
    }

    exitSelectMode()
    queryClient.invalidateQueries({ queryKey: ['gallery', eventId] })
  }

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
            : 'Be the first to upload something memorable.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Admin select-mode toolbar */}
      {isAdmin && (
        <div className="flex items-center justify-between mb-3 min-h-[36px]">
          {deleteError && (
            <p className="font-inter text-sm text-red-600">{deleteError}</p>
          )}
          {!deleteError && <span />}

          <div className="flex items-center gap-2">
            {isSelectMode ? (
              <>
                <span className="font-inter text-sm text-brand-text/60">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0 || isDeleting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white font-inter hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? 'Deleting…' : `Delete${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
                </button>
                <button
                  onClick={exitSelectMode}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-brand-text font-inter hover:bg-gray-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsSelectMode(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-brand-text font-inter hover:bg-gray-50 transition-colors"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Select
              </button>
            )}
          </div>
        </div>
      )}

      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
        {allMedia.map((item, i) => (
          <MediaTile
            key={item.id}
            item={item}
            onClick={isSelectMode ? () => toggleSelect(item.id) : () => setSelectedIndex(i)}
            isFavorited={favoriteSet.has(item.id)}
            onToggleFavorite={(e) => {
              e.stopPropagation()
              toggleFavorite(item.id)
            }}
            isAuthenticated={isAuthenticated}
            isSelectMode={isSelectMode}
            isSelected={selectedIds.has(item.id)}
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

      {selectedIndex !== null && !isSelectMode && (
        <Lightbox
          media={allMedia}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          isFavorited={(id) => favoriteSet.has(id)}
          onToggleFavorite={toggleFavorite}
          isAuthenticated={isAuthenticated}
          onReachEnd={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
        />
      )}
    </>
  )
}
