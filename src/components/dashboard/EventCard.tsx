'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { uploadEventCover } from '@/app/actions/events'
import type { EventWithCount } from '@/app/actions/events'

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface EventCardProps {
  event: EventWithCount
  isAdmin?: boolean
}

export function EventCard({ event, isAdmin = false }: EventCardProps) {
  const [coverUrl, setCoverUrl] = useState(event.cover_image_url ?? null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaLabel = event.media_count === 1 ? '1 item' : `${event.media_count} items`

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    try {
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
        || /\.(heic|heif)$/i.test(file.name)

      let fileToUpload: File | Blob = file
      if (isHeic) {
        const heic2any = (await import('heic2any')).default
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
        fileToUpload = Array.isArray(converted) ? converted[0] : converted
      }

      const fd = new FormData()
      fd.append('file', fileToUpload, isHeic ? file.name.replace(/\.(heic|heif)$/i, '.jpg') : file.name)
      const result = await uploadEventCover(event.id, fd)

      if (result.error) {
        toast.error(result.error)
        return
      }

      setCoverUrl(result.cover_image_url ?? null)
      toast.success('Cover image updated.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [event.id])

  return (
    <div className={cn(
      'group block bg-white border border-brand-border rounded-xl shadow-sm',
      'overflow-hidden',
      'hover:-translate-y-0.5 hover:shadow-md hover:border-gold/40',
      'transition-all duration-200',
    )}>
      {/* Cover image / fallback */}
      <Link
        href={`/events/${event.id}`}
        className="block relative aspect-video w-full overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`Cover image for ${event.name}`}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-gold/60">
              <ImageIcon className="h-10 w-10" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/10" />
          </div>
        )}

        {/* Admin: hover overlay to change cover */}
        {isAdmin && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => {
              e.preventDefault()
              fileInputRef.current?.click()
            }}
          >
            {uploading ? (
              <Loader2 className="h-7 w-7 text-white animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-white">
                <ImagePlus className="h-7 w-7" />
                <span className="font-inter text-xs font-medium">
                  {coverUrl ? 'Change Cover' : 'Add Cover'}
                </span>
              </div>
            )}
          </div>
        )}
      </Link>

      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Card body */}
      <Link
        href={`/events/${event.id}`}
        className="block p-4 space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      >
        <h3
          className={cn(
            'font-playfair font-bold text-brand-text leading-snug',
            'text-base line-clamp-2',
            'group-hover:text-gold transition-colors duration-150'
          )}
        >
          {event.name}
        </h3>

        <p className="text-xs font-inter text-gray-500">
          {formatEventDate(event.event_date)}
        </p>

        <div className="pt-1">
          <Badge variant="secondary" className="text-xs">
            {mediaLabel}
          </Badge>
        </div>
      </Link>
    </div>
  )
}
