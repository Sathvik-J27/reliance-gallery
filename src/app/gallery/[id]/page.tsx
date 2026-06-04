import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { ArrowLeft, CalendarDays, Images } from 'lucide-react'
import { getEventPublic, getEventUploadersPublic } from '@/app/actions/gallery'
import { EventLockScreen } from '@/components/events/EventLockScreen'
import { GalleryEventClient } from './GalleryEventClient'
import { createServiceClient } from '@/lib/supabase/service'
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { event } = await getEventPublic(params.id)
  if (!event) return { title: 'Event Not Found' }
  return { title: `${event.name} — Reliance Surfaces Gallery` }
}

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function GalleryEventPage({ params }: Props) {
  const cookieStore = await cookies()
  const visitorLabel = cookieStore.get('visitor_sid')?.value ?? 'guest'

  const [eventResult, uploadersResult] = await Promise.all([
    getEventPublic(params.id),
    getEventUploadersPublic(params.id),
  ])

  if (!eventResult.event) notFound()

  const event = eventResult.event
  const uploaders = uploadersResult.uploaders ?? []

  const isLocked = !!event.access_code
  const hasAccess =
    !isLocked ||
    cookieStore.get(`event_lock_${event.id}`)?.value === '1'

  const supabase = createServiceClient()
  const { count: mediaCount } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  if (!hasAccess) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <EventLockScreen
          eventId={event.id}
          eventName={event.name}
          backHref="/gallery"
          backLabel="All events"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back link */}
      <Link
        href="/gallery"
        className="inline-flex items-center gap-1.5 font-inter text-sm text-gray-500 hover:text-gold transition-colors mb-6 group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        All events
      </Link>

      {/* Event header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-brand-text leading-tight">
              {event.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="flex items-center gap-1.5 font-inter text-sm text-gray-500">
                <CalendarDays className="h-4 w-4 text-gold shrink-0" />
                {formatEventDate(event.event_date)}
              </span>
              <span className="flex items-center gap-1.5 font-inter text-sm text-gray-500">
                <Images className="h-4 w-4 text-gold shrink-0" />
                {mediaCount ?? 0} item{mediaCount !== 1 ? 's' : ''}
              </span>
            </div>

            {event.description && (
              <p className="mt-3 font-inter text-sm text-gray-600 max-w-2xl leading-relaxed">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Gold divider */}
        <div className="mt-6 h-px bg-gradient-to-r from-gold/40 via-gold/20 to-transparent" />
      </div>

      {/* Gallery */}
      <GalleryEventClient eventId={event.id} uploaders={uploaders} visitorLabel={visitorLabel} />
    </main>
  )
}
