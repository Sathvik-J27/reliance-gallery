'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
}

export function EventCard({ event }: EventCardProps) {
  const coverUrl = event.cover_image_url ?? null
  const mediaLabel = event.media_count === 1 ? '1 item' : `${event.media_count} items`

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
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

        {event.is_locked && (
          <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <Lock className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </Link>

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
