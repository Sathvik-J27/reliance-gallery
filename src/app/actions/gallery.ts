'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { r2ThumbnailUrl, r2DisplayUrl, R2_PUBLIC_URL } from '@/lib/r2'
import type { Media, Profile, Event } from '@/types/database'

export type MediaWithUploader = Media & {
  uploader: Pick<Profile, 'id' | 'full_name' | 'email'> | null
  thumbnail_url?: string | null  // CDN URL for thumbnail (grid display)
  cdn_url?: string | null        // CDN URL for display-quality image/video (lightbox)
}

// access_code is stripped — clients only receive is_locked boolean
export type EventWithCount = Omit<Event, 'access_code'> & {
  media_count: number
  is_locked: boolean
}

// ---------------------------------------------------------------------------
// assertVisitorAccess — throws if visitor cookie is missing or version-stale
// ---------------------------------------------------------------------------
async function assertVisitorAccess() {
  const cookieStore = await cookies()
  const cookieName = process.env.VISITOR_COOKIE_NAME ?? 'visitor_access'
  const val = cookieStore.get(cookieName)?.value
  if (!val) throw new Error('Visitor access required.')

  const supabase = createServiceClient()
  const { data: currentVersion } = await supabase.rpc('get_code_version')
  if (currentVersion && val !== currentVersion) {
    throw new Error('Visitor access required.')
  }
}

// ---------------------------------------------------------------------------
// getEventsPublic — all events with media count (service role, visitor only)
// ---------------------------------------------------------------------------
export async function getEventsPublic(): Promise<{
  events?: EventWithCount[]
  error?: string
}> {
  await assertVisitorAccess()

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, media(count)')
    .order('event_date', { ascending: false })

  if (error) return { error: error.message }

  const events: EventWithCount[] = (data ?? []).map((row) => {
    const { media, access_code, ...rest } = row as Event & {
      media: Array<{ count: number }>
    }
    const media_count =
      Array.isArray(media) && media.length > 0 ? (media[0].count ?? 0) : 0
    return { ...rest, media_count, is_locked: access_code !== null }
  })

  return { events }
}

// ---------------------------------------------------------------------------
// getEventPublic — single event (service role, visitor only)
// ---------------------------------------------------------------------------
export async function getEventPublic(
  id: string
): Promise<{ event?: Event; error?: string }> {
  await assertVisitorAccess()

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { event: data as Event }
}

// ---------------------------------------------------------------------------
// getEventMediaPagePublic — cursor-based paginated media (service role).
// Thumbnails and display images are served from Cloudflare R2 CDN — no
// Supabase storage reads, zero egress from Supabase.
// ---------------------------------------------------------------------------
export async function getEventMediaPagePublic(
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
  await assertVisitorAccess()

  const supabase = createServiceClient()
  const PAGE_SIZE = 30

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('media')
    .select(`
      id, event_id, storage_path, thumbnail_path, display_path,
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

  const media = items.map((item) => ({
    ...item,
    thumbnail_url: item.thumbnail_path ? r2ThumbnailUrl(item.thumbnail_path) : null,
    cdn_url: item.display_path
      ? r2DisplayUrl(item.display_path)
      : item.storage_path
      ? `${R2_PUBLIC_URL}/${item.storage_path}`
      : null,
  }))

  return { media, nextCursor }
}

// ---------------------------------------------------------------------------
// getEventUploadersPublic — distinct uploaders for an event (service role)
// ---------------------------------------------------------------------------
export async function getEventUploadersPublic(
  eventId: string
): Promise<{
  uploaders: Pick<Profile, 'id' | 'full_name' | 'email'>[]
  error?: string
}> {
  await assertVisitorAccess()

  const supabase = createServiceClient()

  const { data: rows, error } = await supabase
    .from('media')
    .select('uploader_id')
    .eq('event_id', eventId)
    .not('uploader_id', 'is', null)

  if (error) return { uploaders: [], error: error.message }

  const uniqueIds = Array.from(
    new Set((rows ?? []).map((r) => r.uploader_id).filter(Boolean))
  )
  if (!uniqueIds.length) return { uploaders: [] }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', uniqueIds)

  if (profilesError) return { uploaders: [], error: profilesError.message }
  return {
    uploaders: (profiles ?? []) as Pick<Profile, 'id' | 'full_name' | 'email'>[],
  }
}
