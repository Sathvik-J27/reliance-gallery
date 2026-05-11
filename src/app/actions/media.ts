'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Media, Profile } from '@/types/database'

export type MediaWithUploader = Media & {
  uploader: Pick<Profile, 'id' | 'full_name' | 'email'> | null
  thumbnail_url?: string | null
  signed_url?: string | null
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
    .upsert(
      {
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
        processing_status: 'pending' as const,
      },
      { onConflict: 'storage_path', ignoreDuplicates: false }
    )
    .select(
      'id, event_id, storage_path, thumbnail_path, file_type, mime_type, ' +
      'file_size_bytes, width, height, duration_seconds, original_filename, ' +
      'created_at, processing_status, processing_error, processing_attempts'
    )
    .single()

  if (error) {
    return { error: error.message }
  }

  return { media: media as unknown as Media }
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

  const ttl = user ? 60 * 60 : 15 * 60 // 1 hour for staff; 15 min for visitors
  const { data, error } = await storageClient
    .from('event-media')
    .createSignedUrl(storagePath, ttl)

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
    .select(`
      id, event_id, storage_path, thumbnail_path,
      file_type, mime_type, file_size_bytes,
      width, height, duration_seconds, original_filename,
      created_at, processing_status,
      uploader:profiles!uploader_id(id, full_name, email)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE)

  if (params.cursor) {
    const sep = params.cursor.lastIndexOf('___')
    const cursorAt = params.cursor.slice(0, sep)
    const cursorId = params.cursor.slice(sep + 3)
    query = query.or(
      `created_at.lt.${cursorAt},and(created_at.eq.${cursorAt},id.lt.${cursorId})`
    )
  }
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
  const lastItem = items.length > 0 ? items[items.length - 1] : null
  const nextCursor =
    items.length === PAGE_SIZE && lastItem
      ? `${lastItem.created_at}___${lastItem.id}`
      : null

  // Only pre-sign items that have no thumbnail — they need the signed URL for
  // grid display. Items with thumbnails use a public thumbnail URL in the grid
  // and the Lightbox signs on-demand via getSignedUrl.
  const pathsToSign = items
    .filter((i) => !i.thumbnail_path && i.storage_path)
    .map((i) => i.storage_path)
  const signedUrlMap: Record<string, string> = {}
  if (pathsToSign.length > 0) {
    const { data: signed } = await supabase.storage
      .from('event-media')
      .createSignedUrls(pathsToSign, 60 * 60)
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedUrlMap[s.path] = s.signedUrl
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const media = items.map((item) => ({
    ...item,
    thumbnail_url: item.thumbnail_path
      ? `${supabaseUrl}/storage/v1/object/public/event-thumbnails/${item.thumbnail_path}`
      : null,
    signed_url: signedUrlMap[item.storage_path] ?? null,
  }))

  return { media, nextCursor }
}

// ---------------------------------------------------------------------------
// deleteMediaBatch — admin-only bulk delete
// ---------------------------------------------------------------------------
export async function deleteMediaBatch(
  ids: string[]
): Promise<{ deleted: number; error?: string }> {
  if (!ids.length) return { deleted: 0 }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { deleted: 0, error: 'You must be signed in to delete media.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { deleted: 0, error: 'Only admins can delete media.' }
  }

  const { error } = await supabase.from('media').delete().in('id', ids)

  if (error) return { deleted: 0, error: error.message }
  return { deleted: ids.length }
}

// ---------------------------------------------------------------------------
// saveVideoThumbnail — upload a client-captured video poster frame using the
// service role so that storage RLS on event-thumbnails doesn't block it.
// ---------------------------------------------------------------------------
export async function saveVideoThumbnail(
  base64DataUrl: string,
  uploadId: string
): Promise<{ path?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated.' }

  const base64 = base64DataUrl.split(',')[1]
  if (!base64) return { error: 'Invalid thumbnail data.' }

  const buffer = Buffer.from(base64, 'base64')
  const thumbPath = `thumbnails/${uploadId}-poster.jpg`

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.storage
    .from('event-thumbnails')
    .upload(thumbPath, buffer, { contentType: 'image/jpeg', upsert: true })

  if (error) return { error: error.message }
  return { path: thumbPath }
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
