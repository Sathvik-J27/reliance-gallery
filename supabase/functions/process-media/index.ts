/**
 * process-media — Supabase Edge Function
 *
 * Triggered via a Postgres `after insert` trigger on the `media` table.
 * The trigger uses the `pg_net` extension to POST to this function via
 * `net.http_post(...)`. See supabase/migrations/005_storage_trigger.sql.
 *
 * Request body: { record: Media }
 *
 * Responsibilities:
 *   - Download the uploaded file from the `event-media` bucket.
 *   - For images: generate a 600 px-wide JPEG thumbnail via the Supabase
 *     image transformation API, upload to `event-thumbnails`, and update
 *     the `media` row with `thumbnail_path` and `processing_status = 'done'`.
 *   - For videos: if the client already uploaded a thumbnail (Phase 7),
 *     just mark done. Otherwise set `thumbnail_path` to the storage path
 *     as a placeholder.
 */

import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MediaRecord {
  id: string
  event_id: string
  uploader_id: string | null
  storage_path: string
  thumbnail_path: string | null
  file_type: 'image' | 'video' | null
  mime_type: string | null
  file_size_bytes: number | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  original_filename: string | null
  created_at: string
  processing_status: string | null
  processing_error: string | null
  processing_attempts: number | null
}

interface RequestBody {
  record: MediaRecord
}

const headers = { 'Content-Type': 'application/json' }

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars' }),
      { status: 500, headers }
    )
  }

  // Parse body
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers,
    })
  }

  const record = body.record
  if (!record?.id || !record?.storage_path) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields in record' }),
      { status: 400, headers }
    )
  }

  // Service-role client — bypasses RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Atomically mark the record as processing and increment the attempt counter
  await supabase.rpc('increment_processing_attempts', { media_id: record.id })

  try {
    if (record.file_type === 'image') {
      await processImage(supabase, supabaseUrl, serviceRoleKey, record)
    } else if (record.file_type === 'video') {
      await processVideo(supabase, record)
    } else {
      // Unknown file_type: still mark done so it doesn't get retried forever
      await supabase
        .from('media')
        .update({ processing_status: 'done' })
        .eq('id', record.id)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[process-media] Error processing ${record.id}:`, message)
    await supabase
      .from('media')
      .update({ processing_status: 'failed', processing_error: message })
      .eq('id', record.id)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
})

// ---------------------------------------------------------------------------
// processImage
// ---------------------------------------------------------------------------
async function processImage(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  record: MediaRecord
): Promise<void> {
  // Use Supabase image transformation API to produce a 600 px-wide JPEG.
  // Endpoint: /storage/v1/render/image/authenticated/<path>?width=600&quality=80
  const transformUrl =
    `${supabaseUrl}/storage/v1/render/image/authenticated/event-media/${record.storage_path}` +
    `?width=600&quality=80`

  const transformRes = await fetch(transformUrl, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  })

  if (!transformRes.ok) {
    throw new Error(
      `Image transformation failed: ${transformRes.status} ${transformRes.statusText}`
    )
  }

  const thumbnailBytes = await transformRes.arrayBuffer()

  // Upload thumbnail to the public `event-thumbnails` bucket
  const thumbnailPath = `thumbnails/${record.id}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('event-thumbnails')
    .upload(thumbnailPath, thumbnailBytes, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '86400',
    })

  if (uploadError) {
    throw new Error(`Thumbnail upload failed: ${uploadError.message}`)
  }

  // Mark done and store thumbnail path
  const { error: updateError } = await supabase
    .from('media')
    .update({ processing_status: 'done', thumbnail_path: thumbnailPath, processing_error: null })
    .eq('id', record.id)

  if (updateError) {
    throw new Error(`Media record update failed: ${updateError.message}`)
  }
}

// ---------------------------------------------------------------------------
// processVideo
// ---------------------------------------------------------------------------
async function processVideo(
  supabase: ReturnType<typeof createClient>,
  record: MediaRecord
): Promise<void> {
  // If the client already captured a poster frame (Phase 7), nothing to do.
  if (record.thumbnail_path) {
    await supabase
      .from('media')
      .update({ processing_status: 'done', processing_error: null })
      .eq('id', record.id)
    return
  }

  // Client thumbnail capture failed or wasn't sent. Just mark done with no thumbnail
  // so the gallery shows a clean video placeholder rather than a broken image URL.
  const { error } = await supabase
    .from('media')
    .update({ processing_status: 'done', processing_error: null })
    .eq('id', record.id)

  if (error) {
    throw new Error(`Media record update failed: ${error.message}`)
  }
}
