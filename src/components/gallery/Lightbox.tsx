'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Star, Volume2, VolumeX } from 'lucide-react'
import type { MediaWithUploader } from '@/app/actions/media'
import { VisitorWatermark } from './VisitorWatermark'
import { cn } from '@/lib/utils'

interface LightboxProps {
  media: MediaWithUploader[]
  initialIndex: number
  onClose: () => void
  isFavorited: (id: string) => boolean
  onToggleFavorite: (id: string) => void
  isAuthenticated: boolean
  isVisitor?: boolean
  visitorLabel?: string
  onReachEnd?: () => void
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

function formatDT(d: string): string {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function touchDist(t: React.TouchList | TouchList): number {
  const dx = t[0].clientX - t[1].clientX
  const dy = t[0].clientY - t[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export function Lightbox({
  media,
  initialIndex,
  onClose,
  isFavorited,
  onToggleFavorite,
  isAuthenticated,
  isVisitor = false,
  visitorLabel,
  onReachEnd,
}: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex)
  const [fullLoaded, setFullLoaded] = useState(false)
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 })
  const [showMeta, setShowMeta] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const zoomRef = useRef(zoom)
  const touchState = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isPinching: false,
    lastDist: 0,
    moved: false,
  })

  const item = media[idx]
  const currentUrl = item?.cdn_url ?? null

  // Keep zoomRef in sync for native touch handlers
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // Reset zoom, mute, and fullLoaded on navigation
  useEffect(() => {
    setZoom({ scale: 1, x: 0, y: 0 })
    setIsMuted(true)
    setFullLoaded(false)
  }, [idx])

  // Trigger load-more when near end
  useEffect(() => {
    if (idx >= media.length - 3) onReachEnd?.()
  }, [idx, media.length, onReachEnd])

  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])
  const goNext = useCallback(
    () => setIdx((i) => Math.min(media.length - 1, i + 1)),
    [media.length]
  )

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, goPrev, goNext])

  // Lock body scroll; focus container
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    containerRef.current?.focus()
    return () => { document.body.style.overflow = '' }
  }, [])

  // Pause video when navigating away
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [idx])

  // Native touchmove with passive:false so we can call preventDefault
  // (prevents iOS from zooming/scrolling the page during pinch/pan)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleTM = (e: TouchEvent) => {
      e.preventDefault()
      const ts = touchState.current
      if (e.touches.length === 2 && ts.isPinching) {
        const dist = touchDist(e.touches as unknown as React.TouchList)
        if (ts.lastDist > 0) {
          const delta = dist / ts.lastDist
          setZoom((prev) => ({
            ...prev,
            scale: Math.max(1, Math.min(6, prev.scale * delta)),
          }))
        }
        ts.lastDist = dist
      } else if (e.touches.length === 1 && !ts.isPinching && zoomRef.current.scale > 1) {
        const dx = e.touches[0].clientX - ts.lastX
        const dy = e.touches[0].clientY - ts.lastY
        ts.lastX = e.touches[0].clientX
        ts.lastY = e.touches[0].clientY
        ts.moved = true
        setZoom((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
      } else if (e.touches.length === 1) {
        ts.moved = true
      }
    }
    el.addEventListener('touchmove', handleTM, { passive: false })
    return () => el.removeEventListener('touchmove', handleTM)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    const ts = touchState.current
    ts.moved = false
    if (e.touches.length === 2) {
      ts.isPinching = true
      ts.lastDist = touchDist(e.touches)
    } else {
      ts.isPinching = false
      ts.startX = e.touches[0].clientX
      ts.startY = e.touches[0].clientY
      ts.lastX = e.touches[0].clientX
      ts.lastY = e.touches[0].clientY
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const ts = touchState.current
    if (ts.isPinching) { ts.isPinching = false; return }
    if (!ts.moved) return
    if (zoomRef.current.scale > 1) return // pan mode, no nav

    const dx = (e.changedTouches[0]?.clientX ?? 0) - ts.startX
    const dy = (e.changedTouches[0]?.clientY ?? 0) - ts.startY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx > 60 && absDx > absDy * 1.5) {
      if (dx > 0) { goPrev() } else { goNext() }
    } else if (dy > 100 && absDy > absDx * 1.5) {
      onClose()
    }
  }

  const handleToggleMute = () => {
    if (!videoRef.current) return
    const next = !isMuted
    videoRef.current.muted = next
    videoRef.current.volume = next ? 0 : 1
    setIsMuted(next)
  }

  const handleDownload = () => {
    if (!currentUrl) return
    const a = document.createElement('a')
    a.href = currentUrl
    a.download = item.original_filename ?? 'download'
    a.click()
  }

  if (!item) return null

  const uploaderName =
    item.uploader?.full_name ??
    item.uploader?.email?.split('@')[0] ??
    'Unknown'

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col outline-none touch-none select-none"
      tabIndex={-1}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => onToggleFavorite(item.id)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors"
              aria-label={isFavorited(item.id) ? 'Remove favorite' : 'Add favorite'}
            >
              <Star
                className={cn(
                  'h-5 w-5 transition-colors',
                  isFavorited(item.id) ? 'fill-gold text-gold' : 'text-white'
                )}
              />
            </button>
          )}
          {!isVisitor && (
            <button
              onClick={handleDownload}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors"
              aria-label="Download"
            >
              <Download className="h-5 w-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── Content area ── */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0 px-2 py-2"
        onClick={() => setShowMeta((v) => !v)}
      >
        {/* Desktop prev arrow */}
        {idx > 0 && (
          <button
            className="absolute left-4 z-10 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
        {/* Desktop next arrow */}
        {idx < media.length - 1 && (
          <button
            className="absolute right-4 z-10 hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 transition-colors"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Media */}
        {item.file_type === 'image' ? (
          <div
            className="relative flex items-center justify-center w-full h-full"
            style={{
              transform: `translate(${zoom.x}px,${zoom.y}px) scale(${zoom.scale})`,
              transition: zoom.scale === 1 ? 'transform 0.2s' : 'none',
              willChange: 'transform',
            }}
            onContextMenu={isVisitor ? (e) => e.preventDefault() : undefined}
          >
            {/* Blurred thumbnail — visible instantly while the full image loads */}
            {item.thumbnail_url && !fullLoaded && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail_url}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-contain blur-sm scale-105"
              />
            )}

            {/* Full-res original — crossfades in once loaded */}
            {currentUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUrl}
                alt={item.original_filename ?? 'Photo'}
                className="relative w-full h-full object-contain transition-opacity duration-500"
                style={{ opacity: fullLoaded ? 1 : 0 }}
                onLoad={() => setFullLoaded(true)}
                draggable={false}
              />
            )}

            {/* Skeleton — only when there is no thumbnail and no URL yet */}
            {!item.thumbnail_url && !currentUrl && (
              <div className="w-[min(90vw,600px)] h-[min(80vh,400px)] bg-white/5 animate-pulse rounded" />
            )}

            {/* Invisible overlay to block drag-save in visitor mode */}
            {isVisitor && (
              <div
                className="absolute inset-0 z-10 media-overlay"
                onDragStart={(e) => e.preventDefault()}
                style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
              />
            )}

            {/* Watermark */}
            {isVisitor && visitorLabel && (
              <VisitorWatermark label={visitorLabel} />
            )}
          </div>
        ) : (
          <div
            className="relative flex items-center justify-center w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {currentUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={currentUrl}
                  autoPlay
                  muted
                  playsInline
                  controls={isVisitor ? false : !isMuted}
                  className="max-w-full max-h-full rounded"
                />
                {/* Mute/unmute — always shown for visitors; shown for authenticated when muted */}
                {(isVisitor || isMuted) && (
                  <button
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 text-white text-sm font-inter hover:bg-black/80 transition-colors"
                    onClick={handleToggleMute}
                  >
                    {isMuted ? (
                      <><VolumeX className="h-4 w-4" /> Tap to unmute</>
                    ) : (
                      <><Volume2 className="h-4 w-4" /> Tap to mute</>
                    )}
                  </button>
                )}

                {/* Watermark for visitors */}
                {isVisitor && visitorLabel && (
                  <VisitorWatermark label={visitorLabel} />
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Bottom metadata ── */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 px-4 pb-5 pt-10',
          'bg-gradient-to-t from-black/70 to-transparent',
          'transition-opacity duration-300',
          showMeta ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Counter */}
        <span className="absolute top-3 right-4 font-inter text-xs text-white/50">
          {idx + 1} / {media.length}
        </span>

        <p className="font-inter text-sm font-medium text-white">{uploaderName}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="font-inter text-xs text-white/60">{formatDT(item.created_at)}</span>
          {item.file_size_bytes != null && (
            <span className="font-inter text-xs text-white/60">{formatBytes(item.file_size_bytes)}</span>
          )}
          {item.width && item.height && (
            <span className="font-inter text-xs text-white/60">{item.width} × {item.height}</span>
          )}
          {item.duration_seconds != null && (
            <span className="font-inter text-xs text-white/60">
              {Math.floor(item.duration_seconds / 60)}:{String(Math.round(item.duration_seconds % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
