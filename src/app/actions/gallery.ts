'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import type { Media, Profile, Event } from '@/types/database'

export type MediaWithUploader = Media & {
  uploader: Pick<Profile, 'id' | 'full_name' | 'email'> | null
  thumbnail_url?: string | null
}

export type EventWithCount = Event & { media_count: number }

// ---------------------------------------------------------------------------
// assertVisitorAccess — throws if visitor cookie is missing/invalid
// ---------------------------------------------------------------------------
async function assertVisitorAccess() {
  const cookieStore = await cookies()
  const cookieName = process.env.VISITOR_COOKIE_NAME ?? 'visitor_access'
  const val = cookieStore.get(cookieName)?.value
  if (val !== 'authenticated') {
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
    const { media, ...rest } = row as Event & {
      media: Array<{ count: number }>
    }
    const media_count =
      Array.isArray(media) && media.length > 0 ? (media[0].count ?? 0) : 0
    return { ...rest, media_count }
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
// getEventMediaPagePublic — cursor-based paginated media (service role)
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
  const media = await Promise.all(
    items.map(async (item) => {
      if (item.thumbnail_path) {
        return {
          ...item,
          thumbnail_url: `${supabaseUrl}/storage/v1/object/public/event-thumbnails/${item.thumbnail_path}`,
        }
      }
      if (item.file_type === 'image') {
        const { data: signed } = await supabase.storage
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

// ---------------------------------------------------------------------------
// getSignedUrlPublic — signed download URL via service role (visitor safe)
// ---------------------------------------------------------------------------
export async function getSignedUrlPublic(
  storagePath: string
): Promise<{ url?: string; error?: string }> {
  await assertVisitorAccess()

  const supabase = createServiceClient()

  const { data, error } = await supabase.storage
    .from('event-media')
    .createSignedUrl(storagePath, 60 * 60) // 1 hour

  if (error) return { error: error.message }
  return { url: data.signedUrl }
}
