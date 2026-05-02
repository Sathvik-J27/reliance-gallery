'use server'

import { createClient } from '@/lib/supabase/server'
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

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' } as const
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' } as const
  return { user }
}

export async function getAdminStats(): Promise<{ stats?: AdminStats; error?: string }> {
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

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
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

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
  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  if (auth.user.id === targetUserId) {
    return { error: 'You cannot change your own role.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }
  return {}
}

/**
 * Delegates to the `set_visitor_code` security-definer DB function
 * so the bcrypt hash is computed in Postgres and never touches JS.
 */
export async function rotateVisitorCode(newCode: string): Promise<{ error?: string }> {
  if (!/^\d{6}$/.test(newCode)) {
    return { error: 'Code must be exactly 6 digits (numbers only).' }
  }

  const supabase = await createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { error } = await supabase.rpc('set_visitor_code', { new_code: newCode })
  if (error) return { error: error.message }
  return {}
}
