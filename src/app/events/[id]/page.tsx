import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getEvent } from '@/app/actions/events'
import { EventHeader } from '@/components/events/EventHeader'
import { EventGallery } from '@/components/events/EventGallery'
import { UploadFAB } from '@/components/events/UploadFAB'
import { EventLockScreen } from '@/components/events/EventLockScreen'
import type { Metadata } from 'next'

interface EventPageProps {
  params: { id: string }
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { event } = await getEvent(params.id)
  if (!event) return { title: 'Event Not Found' }
  return { title: event.name }
}

export default async function EventPage({ params }: EventPageProps) {
  const supabase = await createClient()

  const [eventResult, { data: { user } }, cookieStore] = await Promise.all([
    getEvent(params.id),
    supabase.auth.getUser(),
    cookies(),
  ])

  if (!eventResult.event) {
    notFound()
  }

  const event = eventResult.event

  const { count: mediaCount } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  // Admins always bypass the lock; everyone else must have entered the code
  const isLocked = !!event.access_code
  const hasAccess =
    isAdmin ||
    !isLocked ||
    cookieStore.get(`event_lock_${event.id}`)?.value === '1'

  // Strip access_code before passing to any client component
  const { access_code: _ac, ...eventForClient } = event

  const mainClass = `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12${user ? ' pb-24 md:pb-12' : ' pb-8 sm:pb-12'}`

  if (!hasAccess) {
    return (
      <main className={mainClass}>
        <EventLockScreen
          eventId={event.id}
          eventName={event.name}
          backHref="/dashboard"
        />
      </main>
    )
  }

  return (
    <main className={mainClass}>
      <EventHeader
        event={eventForClient}
        mediaCount={mediaCount ?? 0}
        isAdmin={isAdmin}
        isLocked={isLocked}
      />

      <EventGallery eventId={event.id} isAuthenticated={!!user} isAdmin={isAdmin} />

      {user && <UploadFAB eventId={event.id} />}
    </main>
  )
}
