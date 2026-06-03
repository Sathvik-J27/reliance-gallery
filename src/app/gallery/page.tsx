import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon, Images } from 'lucide-react'
import { getEventsPublic } from '@/app/actions/gallery'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'
import type { EventWithCount } from '@/app/actions/gallery'

export const metadata: Metadata = {
  title: 'Gallery — Reliance Surfaces',
}

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function VisitorEventCard({ event }: { event: EventWithCount }) {
  const mediaLabel =
    event.media_count === 1 ? '1 item' : `${event.media_count} items`

  return (
    <Link
      href={`/gallery/${event.id}`}
      className="group block bg-white border border-brand-border rounded-xl shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-gold/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
    >
      {/* Cover */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-100">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={`Cover for ${event.name}`}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <>
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-gold/60" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/10" />
          </>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <h3 className="font-playfair font-bold text-brand-text leading-snug text-base line-clamp-2 group-hover:text-gold transition-colors duration-150">
          {event.name}
        </h3>
        {event.description && (
          <p className="font-inter text-xs text-gray-500 line-clamp-2">
            {event.description}
          </p>
        )}
        <p className="text-xs font-inter text-gray-400">
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

export default async function GalleryPage() {
  const { events = [], error } = await getEventsPublic()

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 font-inter text-xs font-medium text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Visitor View
          </span>
        </div>
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-brand-text mt-3">
          Event Gallery
        </h1>
        <p className="mt-2 font-inter text-sm text-gray-500">
          Browse photos and videos from Reliance Surfaces events.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 font-inter">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 mb-5">
            <Images className="h-8 w-8 text-gold" />
          </div>
          <h2 className="font-playfair text-xl font-semibold text-brand-text mb-2">
            No events yet
          </h2>
          <p className="font-inter text-sm text-gray-500 max-w-xs">
            Check back soon — events will appear here once they&apos;re published.
          </p>
        </div>
      )}

      {/* Event grid */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {events.map((event) => (
            <VisitorEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  )
}
