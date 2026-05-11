'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import { Play, Star, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisitorWatermark } from './VisitorWatermark'
import type { MediaWithUploader } from '@/app/actions/media'

interface MediaTileProps {
  item: MediaWithUploader
  onClick: () => void
  isFavorited: boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  isAuthenticated: boolean
  isSelectMode?: boolean
  isSelected?: boolean
  eventName?: string
  index?: number
  visitorLabel?: string
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const MediaTile = memo(function MediaTile({
  item,
  onClick,
  isFavorited,
  onToggleFavorite,
  isAuthenticated,
  isSelectMode = false,
  isSelected = false,
  eventName,
  index = 0,
  visitorLabel,
}: MediaTileProps) {
  const [imgError, setImgError] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const thumbnailUrl = item.thumbnail_url
    ?? (item.thumbnail_path
      ? `${supabaseUrl}/storage/v1/object/public/event-thumbnails/${item.thumbnail_path}`
      : null)

  const displayUrl = imgError
    ? null
    : (thumbnailUrl ??
    (item.file_type === 'image' ? (item.signed_url ?? null) : null))

  const isFailed = !displayUrl && item.processing_status === 'failed'

  const aspectRatio =
    item.width && item.height ? item.width / item.height : 4 / 3

  const uploaderName =
    item.uploader?.full_name ??
    item.uploader?.email?.split('@')[0] ??
    'Unknown'

  return (
    <div className="break-inside-avoid mb-2 relative group cursor-pointer">
      <div
        className={cn(
          'relative overflow-hidden rounded-sm bg-gray-100 transition-all duration-150',
          isSelectMode && isSelected && 'ring-4 ring-gold ring-offset-2'
        )}
        onClick={onClick}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={item.original_filename ?? 'Media'}
            width={600}
            height={Math.round(600 / aspectRatio)}
            className={cn(
              'w-full h-auto block transition-transform duration-300',
              !isSelectMode && 'group-hover:scale-105',
              isSelectMode && isSelected && 'brightness-75'
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={index < 8}
            loading={index < 8 ? undefined : 'lazy'}
            onError={() => setImgError(true)}
          />
        ) : item.file_type === 'video' && item.signed_url ? (
          // No stored thumbnail yet — let the browser render the first frame
          <video
            src={item.signed_url}
            className={cn(
              'w-full h-auto block pointer-events-none transition-transform duration-300',
              !isSelectMode && 'group-hover:scale-105',
              isSelectMode && isSelected && 'brightness-75'
            )}
            style={{ aspectRatio }}
            preload="metadata"
            muted
            playsInline
          />
        ) : isFailed ? (
          <div
            className="w-full bg-gray-100 flex flex-col items-center justify-center gap-1"
            style={{ aspectRatio }}
          >
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-xs text-gray-400">Processing failed</span>
          </div>
        ) : (
          <div
            className="w-full bg-gray-100 flex items-center justify-center"
            style={{ aspectRatio }}
          >
            <Loader2 className="h-6 w-6 text-gold animate-spin" />
          </div>
        )}

        {/* Video play icon — hidden in select mode */}
        {item.file_type === 'video' && !isSelectMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Event name badge */}
        {eventName && !isSelectMode && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <span className="font-inter text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-full max-w-[120px] truncate block">
              {eventName}
            </span>
          </div>
        )}

        {/* Hover gradient + uploader info — hidden in select mode */}
        {!isSelectMode && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <p className="font-inter text-xs font-medium text-white truncate">{uploaderName}</p>
              <p className="font-inter text-xs text-white/70">{relativeTime(item.created_at)}</p>
            </div>
          </>
        )}

        {/* Watermark overlay */}
        {visitorLabel && <VisitorWatermark label={visitorLabel} />}

        {/* Select mode: checkmark badge */}
        {isSelectMode && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <div className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
              isSelected
                ? 'bg-gold border-gold'
                : 'bg-black/40 border-white/80'
            )}>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-white fill-white" />}
            </div>
          </div>
        )}

        {/* Favorite star — hidden in select mode */}
        {isAuthenticated && !isSelectMode && (
          <button
            className={cn(
              'absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              isFavorited && 'opacity-100'
            )}
            onClick={onToggleFavorite}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={cn(
                'h-4 w-4 transition-colors drop-shadow',
                isFavorited ? 'fill-gold text-gold' : 'text-white'
              )}
            />
          </button>
        )}
      </div>
    </div>
  )
}, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.processing_status === next.item.processing_status &&
  prev.item.thumbnail_path === next.item.thumbnail_path &&
  prev.item.thumbnail_url === next.item.thumbnail_url &&
  prev.isFavorited === next.isFavorited &&
  prev.isAuthenticated === next.isAuthenticated &&
  prev.isSelectMode === next.isSelectMode &&
  prev.isSelected === next.isSelected &&
  prev.eventName === next.eventName &&
  prev.visitorLabel === next.visitorLabel
)
