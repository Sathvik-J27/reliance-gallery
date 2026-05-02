'use server'

import { createClient } from '@/lib/supabase/server'
import type { Media, Profile, Event } from '@/types/database'

export type FavoriteMediaWithEvent = Media & {
  uploader: Pick<Profile, 'id' | 'full_name' | 'email'> | null
  event: Pick<Event, 'id' | 'name' | 'event_date'> | null
}

// ---------------------------------------------------------------------------
// toggleFavorite — add or remove a favorite for the current user
// ---------------------------------------------------------------------------
export async function toggleFavorite(
  mediaId: string
): Promise<{ favorited: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { favorited: false, error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('favorites')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('media_id', mediaId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('media_id', mediaId)
    if (error) return { favorited: true, error: error.message }
    return { favorited: false }
  }

  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, media_id: mediaId })
  if (error) return { favorited: false, error: error.message }
  return { favorited: true }
}

// ---------------------------------------------------------------------------
// getUserFavorites — all starred media for the current user across all events
// ---------------------------------------------------------------------------
export async function getUserFavorites(): Promise<{
  media: FavoriteMediaWithEvent[]
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { media: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('favorites')
    .select(`
      media:media_id (
        id, event_id, uploader_id, storage_path, thumbnail_path,
        file_type, mime_type, file_size_bytes, width, height,
        duration_seconds, original_filename, created_at,
        uploader:profiles!uploader_id(id, full_name, email),
        event:events!event_id(id, name, event_date)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { media: [], error: error.message }

  const media = (data ?? [])
    .map((row: { media: unknown }) => row.media)
    .filter((m): m is FavoriteMediaWithEvent => m !== null)

  return { media }
}

// ---------------------------------------------------------------------------
// getEventFavoriteIds — IDs of media favorited by the current user in an event
// ---------------------------------------------------------------------------
export async function getEventFavoriteIds(
  eventId: string
): Promise<{ ids: string[]; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ids: [] }

  const { data: eventMedia } = await supabase
    .from('media')
    .select('id')
    .eq('event_id', eventId)

  if (!eventMedia?.length) return { ids: [] }

  const { data: favs, error } = await supabase
    .from('favorites')
    .select('media_id')
    .eq('user_id', user.id)
    .in(
      'media_id',
      eventMedia.map((m) => m.id)
    )

  if (error) return { ids: [], error: error.message }
  return { ids: (favs ?? []).map((f) => f.media_id) }
}
