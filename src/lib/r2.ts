import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT ?? 'https://PLACEHOLDER.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? 'PLACEHOLDER',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? 'PLACEHOLDER',
  },
})

export const R2_BUCKET = process.env.R2_BUCKET ?? 'gallery-media'

// Public CDN base URL — all thumbnails and display images are served from here.
// Set NEXT_PUBLIC_R2_PUBLIC_URL in your environment variables.
// Example: https://pub-xxxxxxxxxxxx.r2.dev  (R2 public bucket subdomain)
//      or: https://media.yourdomain.com      (custom Cloudflare domain)
export const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? 'https://PLACEHOLDER.r2.dev'

export function r2ThumbnailUrl(thumbnailPath: string): string {
  return `${R2_PUBLIC_URL}/${thumbnailPath}`
}

export function r2DisplayUrl(displayPath: string): string {
  return `${R2_PUBLIC_URL}/${displayPath}`
}
