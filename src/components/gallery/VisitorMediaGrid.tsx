'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Camera, CheckSquare, Square, Download, X, FilterX } from 'lucide-react'
import { useVisitorGalleryMedia } from '@/hooks/useVisitorGalleryMedia'
import { MediaTile } from './MediaTile'
import { GallerySkeleton } from './MediaSkeleton'
import { Lightbox } from './Lightbox'
import { getSignedUrl } from '@/app/actions/media'
import { cn } from '@/lib/utils'
import type { MediaWithUploader } from '@/app/actions/gallery'
import type { GalleryFilters } from '@/hooks/useGalleryMedia'

interface VisitorMediaGridProps {
  eventId: string
  filters?: GalleryFilters
}

export function VisitorMediaGrid({ eventId, filters }: VisitorMediaGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)
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

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [filters])

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

  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) setSelectedIds(new Set())
      return !prev
    })
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(allMedia.map((m) => m.id)))
  }

  const handleBulkDownload = useCallback(async () => {
    const items = allMedia.filter((m) => selectedIds.has(m.id))
    if (!items.length) return

    setDownloadStatus(`Downloading 1 of ${items.length}…`)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      setDownloadStatus(`Downloading ${i + 1} of ${items.length}…`)
      try {
        const { url } = await getSignedUrl(item.storage_path)
        if (!url) continue
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            const a = document.createElement('a')
            a.href = url
            a.download = item.original_filename ?? `download-${item.id}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            resolve()
          }, i * 400) // stagger to avoid browser blocking
        })
      } catch {
        // continue with next item on error
      }
    }

    setDownloadStatus(null)
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [allMedia, selectedIds])

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

  const selectedCount = selectedIds.size

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="font-inter text-sm text-gray-500">
          {allMedia.length}{hasNextPage ? '+' : ''} item{allMedia.length !== 1 ? 's' : ''}
        </p>

        <div className="flex items-center gap-2">
          {selectMode && (
            <>
              <button
                onClick={selectAll}
                className="font-inter text-xs text-gold hover:underline"
              >
                Select all
              </button>
              <span className="text-brand-border">|</span>
              <span className="font-inter text-xs text-gray-500">
                {selectedCount} selected
              </span>
            </>
          )}

          <button
            onClick={toggleSelectMode}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
              'font-inter text-xs font-medium transition-colors duration-150',
              selectMode
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-gold/10 text-gold hover:bg-gold/20'
            )}
          >
            {selectMode ? (
              <><X className="h-3.5 w-3.5" /> Cancel</>
            ) : (
              <><CheckSquare className="h-3.5 w-3.5" /> Select</>
            )}
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
        {allMedia.map((item, i) => (
          <div key={item.id} className="relative break-inside-avoid mb-2">
            {selectMode ? (
              /* Selection tile wrapper */
              <button
                className={cn(
                  'block w-full text-left focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-gold rounded-sm'
                )}
                onClick={() => toggleItem(item.id)}
                aria-label={
                  selectedIds.has(item.id)
                    ? `Deselect ${item.original_filename ?? 'item'}`
                    : `Select ${item.original_filename ?? 'item'}`
                }
              >
                <MediaTile
                  item={item}
                  onClick={() => {}} // handled by button wrapper
                  isFavorited={false}
                  onToggleFavorite={() => {}}
                  isAuthenticated={false}
                  index={i}
                />
                {/* Selection overlay */}
                <div
                  className={cn(
                    'absolute inset-0 rounded-sm transition-all duration-150',
                    selectedIds.has(item.id)
                      ? 'ring-2 ring-gold bg-gold/20'
                      : 'hover:bg-white/10'
                  )}
                />
                {/* Checkbox indicator */}
                <div className="absolute top-2 left-2 z-10">
                  {selectedIds.has(item.id) ? (
                    <CheckSquare className="h-5 w-5 text-gold drop-shadow" />
                  ) : (
                    <Square className="h-5 w-5 text-white drop-shadow opacity-70" />
                  )}
                </div>
              </button>
            ) : (
              <MediaTile
                item={item}
                onClick={() => setSelectedIndex(i)}
                isFavorited={false}
                onToggleFavorite={() => {}}
                isAuthenticated={false}
                index={i}
              />
            )}
          </div>
        ))}
      </div>

      {/* Scroll sentinel */}
      <div ref={sentinelRef} className="h-1 mt-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 rounded-full border-2 border-gold border-t-transparent animate-spin" />
        </div>
      )}

      {/* ── Lightbox (view mode only) ── */}
      {!selectMode && selectedIndex !== null && (
        <Lightbox
          media={allMedia}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          isFavorited={() => false}
          onToggleFavorite={() => {}}
          isAuthenticated={false}
          onReachEnd={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
        />
      )}

      {/* ── Bulk download FAB ── */}
      {selectMode && selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleBulkDownload}
            disabled={!!downloadStatus}
            className={cn(
              'flex items-center gap-2 rounded-full shadow-xl',
              'bg-gold text-black font-inter font-semibold text-sm',
              'px-6 py-3 transition-all duration-200',
              downloadStatus
                ? 'opacity-70 cursor-wait'
                : 'hover:bg-gold-hover hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0'
            )}
          >
            {downloadStatus ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                {downloadStatus}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download {selectedCount} item{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </>
  )
}
