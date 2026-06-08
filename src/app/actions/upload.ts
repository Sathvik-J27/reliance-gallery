'use server'

import { createClient } from '@/lib/supabase/server'
import { r2, R2_BUCKET } from '@/lib/r2'
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Part size used by the client — must match PART_SIZE in useUploadQueue.ts
const PART_SIZE = 8 * 1024 * 1024 // 8 MB

// ---------------------------------------------------------------------------
// initiateMultipartUpload
// Creates an R2 multipart upload and returns presigned URLs for every part.
// All files (images and videos) go directly from the browser to R2 — zero
// Supabase storage bandwidth.
//
// CORS note: The R2 bucket must expose the `ETag` response header.
// In the Cloudflare dashboard → R2 → your bucket → Settings → CORS, add:
//   AllowedOrigins: [your app domain]
//   AllowedMethods: [GET, PUT]
//   ExposedHeaders: [ETag]
// ---------------------------------------------------------------------------
export async function initiateMultipartUpload(
  eventId: string,
  filename: string,
  contentType: string,
  fileSize: number
): Promise<{
  key?: string
  uploadId?: string
  partUrls?: string[]
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated.' }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const key = `originals/${eventId}/${crypto.randomUUID()}.${ext}`

  const { UploadId } = await r2.send(
    new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    })
  )

  if (!UploadId) return { error: 'Failed to initiate upload.' }

  const partCount = Math.max(1, Math.ceil(fileSize / PART_SIZE))

  const partUrls = await Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(
        r2,
        new UploadPartCommand({
          Bucket: R2_BUCKET,
          Key: key,
          UploadId,
          PartNumber: i + 1,
        }),
        { expiresIn: 3600 } // 1-hour window per part — plenty for even large files
      )
    )
  )

  return { key, uploadId: UploadId, partUrls }
}

// ---------------------------------------------------------------------------
// completeMultipartUpload
// Finalises the R2 multipart upload after all parts are transferred.
// ---------------------------------------------------------------------------
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated.' }

  await r2.send(
    new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .sort((a, b) => a.PartNumber - b.PartNumber)
          .map(({ PartNumber, ETag }) => ({ PartNumber, ETag })),
      },
    })
  )

  return { success: true }
}

// ---------------------------------------------------------------------------
// getPresignedThumbnailUploadUrl
// Returns a short-lived presigned PUT URL for uploading a video thumbnail
// captured client-side (before the worker processes it server-side).
// ---------------------------------------------------------------------------
export async function getPresignedThumbnailUploadUrl(
  thumbnailKey: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated.' }

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: thumbnailKey,
      ContentType: 'image/jpeg',
    }),
    { expiresIn: 300 }
  )

  return { url }
}

// ---------------------------------------------------------------------------
// abortMultipartUpload
// Cleans up an incomplete multipart upload so R2 doesn't charge for orphaned
// parts. Called when the user cancels a file mid-upload.
// ---------------------------------------------------------------------------
export async function abortMultipartUpload(
  key: string,
  uploadId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated.' }

  await r2.send(
    new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      UploadId: uploadId,
    })
  )

  return { success: true }
}
