'use client'

import Image from 'next/image'
import { Play, Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaWithUploader } from '@/app/actions/media'

interface MediaTileProps {
  item: MediaWithUploader
  onClick: () => void
  isFavorited: boolean
  onToggleFavorite: (e: React.MouseEvent) => void
  isAuthenticated: boolean
  eventName?: string
  index?: number
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MediaTile({
  item,
  onClick,
  isFavorited,
  onToggleFavorite,
  isAuthenticated,
  eventName,
  index = 0,
}: MediaTileProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const thumbnailUrl = item.thumbnail_url
    ?? (item.thumbnail_path
      ? `${supabaseUrl}/storage/v1/object/public/event-thumbnails/${item.thumbnail_path}`
      : null)

  const aspectRatio =
    item.width && item.height ? item.width / item.height : 4 / 3

  const uploaderName =
    item.uploader?.full_name ??
    item.uploader?.email?.split('@')[0] ??
    'Unknown'

  return (
    <div
      className="break-inside-avoid mb-2 relative group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-sm bg-gray-100">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={item.original_filename ?? 'Media'}
            width={600}
            height={Math.round(600 / aspectRatio)}
            className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={index < 8}
            loading={index < 8 ? undefined : 'lazy'}
          />
        ) : (
          <div
            className="w-full bg-gray-100 flex items-center justify-center"
            style={{ aspectRatio }}
          >
            <Loader2 className="h-6 w-6 text-gold animate-spin" />
          </div>
        )}

        {/* Video play icon */}
        {item.file_type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Event name badge (shown on hover when provided) */}
        {eventName && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <span className="font-inter text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-full max-w-[120px] truncate block">
              {eventName}
            </span>
          </div>
        )}

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        {/* Hover uploader + time */}
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <p className="font-inter text-xs font-medium text-white truncate">{uploaderName}</p>
          <p className="font-inter text-xs text-white/70">{relativeTime(item.created_at)}</p>
        </div>

        {/* Favorite star */}
        {isAuthenticated && (
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
}
