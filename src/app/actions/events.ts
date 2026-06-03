'use server'

import { createClient } from '@/lib/supabase/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
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
// uploadEventCover — admin only; uploads directly to Cloudflare R2
// ---------------------------------------------------------------------------
export async function uploadEventCover(
  eventId: string,
  formData: FormData
): Promise<{ cover_image_url?: string; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'Only admins can upload event covers.' }
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return { error: 'No file provided.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const r2Key = `event-covers/${eventId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type || 'image/jpeg',
      })
    )
  } catch (err) {
    return { error: 'Upload to R2 failed: ' + (err as Error).message }
  }

  const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`

  const { error: updateError } = await supabase
    .from('events')
    .update({ cover_image_url: publicUrl })
    .eq('id', eventId)

  if (updateError) {
    return { error: updateError.message }
  }

  return { cover_image_url: publicUrl }
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
