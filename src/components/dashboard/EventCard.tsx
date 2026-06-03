'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { EventWithCount } from '@/app/actions/events'

function formatEventDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD from Supabase
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
  const mediaLabel =
    event.media_count === 1 ? '1 item' : `${event.media_count} items`

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        'group block bg-white border border-brand-border rounded-xl shadow-sm',
        'overflow-hidden',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-gold/40',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
      )}
    >
      {/* Cover image / fallback */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-100">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
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
            {/* Subtle gold gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/10" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-2">
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
      </div>
    </Link>
  )
}
