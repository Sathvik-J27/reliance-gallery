import { createClient } from '@supabase/supabase-js'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { writeFile, readFile, unlink, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'

// Point fluent-ffmpeg at the bundled static binary so it works without a
// system-level ffmpeg install (e.g. on Railway where nixpkgs PATH may differ).
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ENDPOINT = process.env.R2_ENDPOINT
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET ?? 'gallery-media'

const POLL_INTERVAL_MS = 5_000
const MAX_ATTEMPTS = 3

const THUMB_WIDTH = 400
const DISPLAY_WIDTH = 1600
const DISPLAY_QUALITY = 85
const VIDEO_DISPLAY_HEIGHT = 720

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

// ---------------------------------------------------------------------------
// R2 helpers
// ---------------------------------------------------------------------------
async function downloadFromR2(key) {
  const { Body } = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  const chunks = []
  for await (const chunk of Body) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function uploadToR2(key, body, contentType) {
  await r2.send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType })
  )
}

async function deleteFromR2(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}

// ---------------------------------------------------------------------------
// Image processing
// ---------------------------------------------------------------------------
async function processImage(media) {
  const { id, storage_path, event_id } = media
  const original = await downloadFromR2(storage_path)
  const img = sharp(original)

  const [thumbBuf, displayBuf] = await Promise.all([
    img.clone().resize(THUMB_WIDTH).jpeg({ quality: 80 }).toBuffer(),
    img.clone().resize(DISPLAY_WIDTH, undefined, { withoutEnlargement: true }).jpeg({ quality: DISPLAY_QUALITY }).toBuffer(),
  ])

  const thumbKey = `thumbnails/${event_id}/${id}.jpg`
  const displayKey = `display/${event_id}/${id}.jpg`

  await Promise.all([
    uploadToR2(thumbKey, thumbBuf, 'image/jpeg'),
    uploadToR2(displayKey, displayBuf, 'image/jpeg'),
  ])

  const meta = await sharp(displayBuf).metadata()
  return { thumbKey, displayKey, width: meta.width ?? null, height: meta.height ?? null }
}

// ---------------------------------------------------------------------------
// Video processing
// ---------------------------------------------------------------------------
function runFfmpeg(inputPath, outputPath, opts) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
    opts(cmd)
    cmd.on('end', resolve).on('error', reject).save(outputPath)
  })
}

async function processVideo(media) {
  const { id, storage_path, event_id } = media
  const original = await downloadFromR2(storage_path)

  const tmpDir = await mkdtemp(join(tmpdir(), 'worker-'))
  const ext = extname(storage_path) || '.mp4'
  const inputPath = join(tmpDir, `input${ext}`)
  const thumbPath = join(tmpDir, 'thumb.jpg')
  const displayPath = join(tmpDir, 'display.mp4')

  await writeFile(inputPath, original)

  await runFfmpeg(inputPath, thumbPath, (cmd) =>
    cmd.outputOptions(['-vframes 1', '-an', `-vf scale=${THUMB_WIDTH}:-2`]).format('image2')
  )

  await runFfmpeg(inputPath, displayPath, (cmd) =>
    cmd
      .videoCodec('libx264')
      .outputOptions([
        '-crf 23',
        '-preset fast',
        '-movflags +faststart',
        `-vf scale=-2:'min(ih,${VIDEO_DISPLAY_HEIGHT})'`,
      ])
      .noAudio()
      .format('mp4')
  )

  const thumbKey = `thumbnails/${event_id}/${id}.jpg`
  const displayKey = `display/${event_id}/${id}.mp4`

  const [thumbBuf, displayBuf] = await Promise.all([readFile(thumbPath), readFile(displayPath)])

  await Promise.all([
    uploadToR2(thumbKey, thumbBuf, 'image/jpeg'),
    uploadToR2(displayKey, displayBuf, 'video/mp4'),
    unlink(inputPath).catch(() => {}),
    unlink(thumbPath).catch(() => {}),
    unlink(displayPath).catch(() => {}),
  ])

  return { thumbKey, displayKey, width: null, height: null }
}

// ---------------------------------------------------------------------------
// Process one queue job
// ---------------------------------------------------------------------------
async function processJob(job) {
  const { id: jobId, media_id: mediaId, attempt } = job

  // Claim the job — change status from queued → running
  await supabase
    .from('processing_queue')
    .update({ status: 'running' })
    .eq('id', jobId)

  await supabase
    .from('media')
    .update({ processing_status: 'processing', processing_attempts: attempt })
    .eq('id', mediaId)

  const { data: media, error: mediaError } = await supabase
    .from('media')
    .select('id, event_id, storage_path, file_type')
    .eq('id', mediaId)
    .single()

  if (mediaError || !media) throw new Error(`Media ${mediaId} not found`)

  const result =
    media.file_type === 'video'
      ? await processVideo(media)
      : await processImage(media)

  // Update media with paths + mark done
  const mediaUpdate = {
    thumbnail_path: result.thumbKey,
    display_path: result.displayKey,
    processing_status: 'done',
    processing_error: null,
  }
  if (result.width) mediaUpdate.width = result.width
  if (result.height) mediaUpdate.height = result.height

  await supabase.from('media').update(mediaUpdate).eq('id', mediaId)

  // Delete original from R2 — display version is now ready
  await deleteFromR2(media.storage_path).catch(() => {})

  await supabase.from('processing_queue').update({ status: 'done' }).eq('id', jobId)

  console.log(`[worker] done — ${media.file_type} ${mediaId}`)
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------
async function poll() {
  const { data: jobs } = await supabase
    .from('processing_queue')
    .select('id, media_id, attempt')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(3)

  if (!jobs?.length) return

  for (const job of jobs) {
    try {
      await processJob(job)
    } catch (err) {
      console.error(`[worker] job ${job.id} failed (attempt ${job.attempt}):`, err.message)

      const exhausted = job.attempt >= MAX_ATTEMPTS

      await supabase
        .from('processing_queue')
        .update({
          status: exhausted ? 'failed' : 'queued',
          attempt: job.attempt + 1,
          last_error: err.message,
        })
        .eq('id', job.id)

      await supabase
        .from('media')
        .update({
          processing_status: exhausted ? 'failed' : 'pending',
          processing_error: err.message,
          processing_attempts: job.attempt,
        })
        .eq('id', job.media_id)
    }
  }
}

console.log('[worker] starting — polling every', POLL_INTERVAL_MS, 'ms')
setInterval(poll, POLL_INTERVAL_MS)
poll()
