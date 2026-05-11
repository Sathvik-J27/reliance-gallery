import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { getAllProfiles, getAdminStats } from '@/app/actions/admin'
import { AdminPageClient } from '@/components/admin/AdminPageClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin — Reliance Surfaces',
}

export default async function AdminPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login?redirectTo=/admin')

  // Run the role check alongside the data fetches — requireAdmin() inside each
  // action reuses the cached getAuthUser() result, so only one Auth call happens
  // for the entire page render.
  const supabase = await createClient()
  const [profileResult, profilesResult, statsResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    getAllProfiles(),
    getAdminStats(),
  ])

  if (profileResult.data?.role !== 'admin') redirect('/dashboard')

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-brand-text">
          Admin Panel
        </h1>
        <p className="mt-2 font-inter text-sm text-gray-500">
          Manage users, rotate visitor access codes, and review gallery statistics.
        </p>
      </div>

      <AdminPageClient
        currentUserId={user.id}
        initialProfiles={profilesResult.profiles ?? []}
        initialStats={statsResult.stats ?? null}
      />
    </main>
  )
}
