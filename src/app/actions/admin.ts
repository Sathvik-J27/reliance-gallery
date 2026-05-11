'use server'

import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Profile } from '@/types/database'

export interface TopUploader {
  id: string
  full_name: string | null
  email: string
  count: number
}

export interface AdminStats {
  totalMedia: number
  totalStorage: number   // bytes
  totalEvents: number
  topUploaders: TopUploader[]
  codeLastUpdated: string | null
}

// Cached per-request: both getAllProfiles and getAdminStats called from the same
// admin page render share this result — only one getUser() + one profile query.
const requireAdmin = cache(async () => {
  const user = await getAuthUser()
  if (!user) return { error: 'Not authenticated.' } as const
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' } as const
  return { user }
})

export async function getAdminStats(): Promise<{ stats?: AdminStats; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = await createClient()
  const [mediaResult, eventsResult, settingsResult] = await Promise.all([
    supabase.from('media').select('file_size_bytes, uploader_id'),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('settings').select('updated_at').eq('id', 1).maybeSingle(),
  ])

  const media = mediaResult.data ?? []
  const totalMedia = media.length
  const totalStorage = media.reduce((sum, m) => sum + (m.file_size_bytes ?? 0), 0)
  const totalEvents = eventsResult.count ?? 0
  const codeLastUpdated = settingsResult.data?.updated_at ?? null

  const uploaderCounts: Record<string, number> = {}
  for (const m of media) {
    if (m.uploader_id) {
      uploaderCounts[m.uploader_id] = (uploaderCounts[m.uploader_id] ?? 0) + 1
    }
  }

  const topUploaderIds = Object.entries(uploaderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  let topUploaders: TopUploader[] = []
  if (topUploaderIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', topUploaderIds)

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
    topUploaders = topUploaderIds.map((id) => {
      const p = profileMap.get(id)
      return { id, full_name: p?.full_name ?? null, email: p?.email ?? '—', count: uploaderCounts[id] }
    })
  }

  return { stats: { totalMedia, totalStorage, totalEvents, topUploaders, codeLastUpdated } }
}

export async function getAllProfiles(): Promise<{ profiles?: Profile[]; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { profiles: (data ?? []) as Profile[] }
}

export async function updateUserRole(
  targetUserId: string,
  newRole: 'admin' | 'staff'
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (auth.user.id === targetUserId) {
    return { error: 'You cannot change your own role.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }
  return {}
}

export async function createManagedUser(data: {
  email: string
  full_name: string
  password: string
  role: 'admin' | 'staff'
}): Promise<{ profile?: Profile; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createServiceClient()

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  })

  if (createError) return { error: createError.message }

  const profile: Profile = {
    id: created.user.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    created_at: created.user.created_at,
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ id: created.user.id, email: data.email, full_name: data.full_name, role: data.role })

  if (profileError) return { error: profileError.message }

  revalidatePath('/admin')
  return { profile }
}

export async function resetUserPassword(
  targetUserId: string,
  newPassword: string
): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const adminClient = createServiceClient()

  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: newPassword,
  })

  if (error) return { error: error.message }
  return {}
}

export async function rotateVisitorCode(newCode: string): Promise<{ error?: string }> {
  if (!/^\d{6}$/.test(newCode)) {
    return { error: 'Code must be exactly 6 digits (numbers only).' }
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const supabase = await createClient()
  const { error } = await supabase.rpc('set_visitor_code', { new_code: newCode })
  if (error) return { error: error.message }
  return {}
}
