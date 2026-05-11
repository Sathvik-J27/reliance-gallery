import { createClient, getAuthUser } from '@/lib/supabase/server'
import { getEvents } from '@/app/actions/events'
import { EventGrid } from '@/components/dashboard/EventGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  // getAuthUser() is cached — one Auth call shared across the request
  const user = await getAuthUser()

  const supabase = await createClient()
  const [eventsResult, profileResult] = await Promise.all([
    getEvents(),
    user
      ? supabase.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const events = eventsResult.events ?? []
  const isAdmin = profileResult.data?.role === 'admin'

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
