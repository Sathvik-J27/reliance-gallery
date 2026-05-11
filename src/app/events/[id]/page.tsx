import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEvent } from '@/app/actions/events'
import { EventHeader } from '@/components/events/EventHeader'
import { EventGallery } from '@/components/events/EventGallery'
import { UploadFAB } from '@/components/events/UploadFAB'
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

  // Fetch event and user profile in parallel
  const [eventResult, { data: { user } }] = await Promise.all([
    getEvent(params.id),
    supabase.auth.getUser(),
  ])

  if (!eventResult.event) {
    notFound()
  }

  const event = eventResult.event

  // Get media count for this event
  const { count: mediaCount } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  // Determine admin role
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  // Extra bottom padding on mobile so FAB doesn't obscure the last gallery rows
  const mainClass = `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12${user ? ' pb-24 md:pb-12' : ' pb-8 sm:pb-12'}`

  return (
    <main className={mainClass}>
      <EventHeader
        event={event}
        mediaCount={mediaCount ?? 0}
        isAdmin={isAdmin}
      />

      <EventGallery eventId={event.id} isAuthenticated={!!user} isAdmin={isAdmin} />

      {/* Mobile FAB — only shown to authenticated users */}
      {user && <UploadFAB eventId={event.id} />}
    </main>
  )
}
