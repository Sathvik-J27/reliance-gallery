'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Media, Profile } from '@/types/database'

export type MediaWithUploader = Media & {
  uploader: Pick<Profile, 'id' | 'full_name' | 'email'> | null
  thumbnail_url?: string | null
}

// ---------------------------------------------------------------------------
// createMediaRecord — insert after a successful upload
// ---------------------------------------------------------------------------
export async function createMediaRecord(data: {
  event_id: string
  storage_path: string
  thumbnail_path?: string
  file_type: 'image' | 'video'
  mime_type: string
  file_size_bytes: number
  original_filename: string
  width?: number
  height?: number
  duration_seconds?: number
}): Promise<{ media?: Media; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to upload media.' }
  }

  const { data: media, error } = await supabase
    .from('media')
    .insert({
      event_id: data.event_id,
      uploader_id: user.id,
      storage_path: data.storage_path,
      thumbnail_path: data.thumbnail_path ?? null,
      file_type: data.file_type,
      mime_type: data.mime_type,
      file_size_bytes: data.file_size_bytes,
      original_filename: data.original_filename,
      width: data.width ?? null,
      height: data.height ?? null,
      duration_seconds: data.duration_seconds ?? null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { media: media as Media }
}

// ---------------------------------------------------------------------------
// getEventMedia — paginated (30 per page), with uploader profile
// ---------------------------------------------------------------------------
export async function getEventMedia(
  eventId: string,
  page = 1
): Promise<{ media?: MediaWithUploader[]; total?: number; error?: string }> {
  const supabase = await createClient()
  const pageSize = 30
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('media')
    .select('*, uploader:profiles!uploader_id(id, full_name, email)', {
      count: 'exact',
    })
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return { error: error.message }
  }

  return {
    media: (data ?? []) as MediaWithUploader[],
    total: count ?? 0,
  }
}

// ---------------------------------------------------------------------------
// deleteMedia — remove a media record (and optionally the storage object)
// ---------------------------------------------------------------------------
export async function deleteMedia(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to delete media.' }
  }

  // Fetch the record first so we know the uploader
  const { data: existing, error: fetchError } = await supabase
    .from('media')
    .select('id, uploader_id, storage_path, thumbnail_path')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { error: 'Media item not found.' }
  }

  // Check role — admin can delete anything; staff can only delete their own
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner = existing.uploader_id === user.id

  if (!isAdmin && !isOwner) {
    return { error: 'You do not have permission to delete this item.' }
  }

  const { error } = await supabase.from('media').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

// ---------------------------------------------------------------------------
// getSignedUrl — 1-hour signed download URL for a private storage object.
// Falls back to the service role client for visitors who have no Supabase
// session but hold a valid visitor_access cookie (middleware-verified).
// ---------------------------------------------------------------------------
export async function getSignedUrl(
  storagePath: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Authenticated staff/admin use the regular client; visitors use service role.
  const storageClient = user
    ? supabase.storage
    : createServiceClient().storage

  const { data, error } = await storageClient
    .from('event-media')
    .createSignedUrl(storagePath, 60 * 60) // 1 hour

  if (error) {
    return { error: error.message }
  }

  return { url: data.signedUrl }
}

// ---------------------------------------------------------------------------
// getEventUploaders — distinct uploaders who have media in an event
// ---------------------------------------------------------------------------
export async function getEventUploaders(
  eventId: string
): Promise<{ uploaders: Pick<Profile, 'id' | 'full_name' | 'email'>[]; error?: string }> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('media')
    .select('uploader_id')
    .eq('event_id', eventId)
    .not('uploader_id', 'is', null)

  if (error) return { uploaders: [], error: error.message }

  const uniqueIds = Array.from(new Set((rows ?? []).map((r) => r.uploader_id).filter(Boolean)))
  if (!uniqueIds.length) return { uploaders: [] }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', uniqueIds)

  if (profilesError) return { uploaders: [], error: profilesError.message }
  return { uploaders: (profiles ?? []) as Pick<Profile, 'id' | 'full_name' | 'email'>[] }
}

// ---------------------------------------------------------------------------
// getEventMediaPage — cursor-based paginated query for infinite scroll
// ---------------------------------------------------------------------------
export async function getEventMediaPage(
  eventId: string,
  params: {
    cursor?: string
    fileType?: 'image' | 'video'
    uploaderId?: string
    dateFrom?: string
    dateTo?: string
  } = {}
): Promise<{
  media: MediaWithUploader[]
  nextCursor: string | null
  error?: string
}> {
  const supabase = await createClient()
  const PAGE_SIZE = 30

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('media')
    .select('*, uploader:profiles!uploader_id(id, full_name, email)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (params.cursor) query = query.lt('created_at', params.cursor)
  if (params.fileType) query = query.eq('file_type', params.fileType)
  if (params.uploaderId) query = query.eq('uploader_id', params.uploaderId)
  if (params.dateFrom) {
    query = query.gte('created_at', new Date(params.dateFrom).toISOString())
  }
  if (params.dateTo) {
    const end = new Date(params.dateTo)
    end.setDate(end.getDate() + 1)
    query = query.lt('created_at', end.toISOString())
  }

  const { data, error } = await query

  if (error) return { media: [], nextCursor: null, error: error.message }

  const items = (data ?? []) as MediaWithUploader[]
  const nextCursor =
    items.length === PAGE_SIZE ? items[items.length - 1].created_at : null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceStorage = createServiceClient().storage
  const media = await Promise.all(
    items.map(async (item) => {
      if (item.thumbnail_path) {
        return {
          ...item,
          thumbnail_url: `${supabaseUrl}/storage/v1/object/public/event-thumbnails/${item.thumbnail_path}`,
        }
      }
      if (item.file_type === 'image') {
        const { data: signed } = await serviceStorage
          .from('event-media')
          .createSignedUrl(item.storage_path, 7200, {
            transform: { width: 600, quality: 80 },
          })
        return { ...item, thumbnail_url: signed?.signedUrl ?? null }
      }
      return { ...item, thumbnail_url: null }
    })
  )

  return { media, nextCursor }
}

// ---------------------------------------------------------------------------
// getUploadPath — generate a storage path for a new upload
// The client uses this path to construct the TUS upload request.
// ---------------------------------------------------------------------------
export async function getUploadPath(
  eventId: string,
  filename: string,
  mimeType: string
): Promise<{ path?: string; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to upload.' }
  }

  void mimeType // passed through to TUS metadata by the client
  const ext = filename.split('.').pop()
  const path = `events/${eventId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`

  return { path }
}
