import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllProfiles, getAdminStats } from '@/app/actions/admin'
import { AdminPageClient } from '@/components/admin/AdminPageClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — Reliance Surfaces',
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [profilesResult, statsResult] = await Promise.all([
    getAllProfiles(),
    getAdminStats(),
  ])

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
