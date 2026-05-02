import { createClient } from '@/lib/supabase/server'
import { getEvents } from '@/app/actions/events'
import { EventGrid } from '@/components/dashboard/EventGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch current user and their profile in parallel
  const [{ data: { user } }, eventsResult] = await Promise.all([
    supabase.auth.getUser(),
    getEvents(),
  ])

  // Determine role
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  const events = eventsResult.events ?? []

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-brand-text">
          Events
        </h1>
        <p className="mt-2 font-inter text-sm text-gray-500">
          Browse and manage your event photo galleries.
        </p>
      </div>

      <EventGrid events={events} isAdmin={isAdmin} />
    </main>
  )
}
