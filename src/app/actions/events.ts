'use server'

import { createClient } from '@/lib/supabase/server'
import type { Event } from '@/types/database'

export type EventWithCount = Event & { media_count: number }

// ---------------------------------------------------------------------------
// createEvent — admin only
// ---------------------------------------------------------------------------
export async function createEvent(data: {
  name: string
  description?: string
  event_date: string
}): Promise<{ event?: Event; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to create an event.' }
  }

  // Verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Could not verify your permissions.' }
  }

  if (profile.role !== 'admin') {
    return { error: 'Only admins can create events.' }
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      name: data.name,
      description: data.description ?? null,
      event_date: data.event_date,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { event: event as Event }
}

// ---------------------------------------------------------------------------
// getEvents — all events with media count
// ---------------------------------------------------------------------------
export async function getEvents(): Promise<{
  events?: EventWithCount[]
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, media(count)')
    .order('event_date', { ascending: false })

  if (error) {
    return { error: error.message }
  }

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
// getEvent — single event by id
// ---------------------------------------------------------------------------
export async function getEvent(
  id: string
): Promise<{ event?: Event; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { event: data as Event }
}

// ---------------------------------------------------------------------------
// updateEvent — admin only
// ---------------------------------------------------------------------------
export async function updateEvent(
  id: string,
  data: Partial<Pick<Event, 'name' | 'description' | 'event_date' | 'cover_image_url'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to update an event.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Could not verify your permissions.' }
  }

  if (profile.role !== 'admin') {
    return { error: 'Only admins can update events.' }
  }

  const { error } = await supabase
    .from('events')
    .update(data)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  return {}
}

// ---------------------------------------------------------------------------
// deleteEvent — admin only
// ---------------------------------------------------------------------------
export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to delete an event.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Could not verify your permissions.' }
  }

  if (profile.role !== 'admin') {
    return { error: 'Only admins can delete events.' }
  }

  const { error } = await supabase.from('events').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  return {}
}
