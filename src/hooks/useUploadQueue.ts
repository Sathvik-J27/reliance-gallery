'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import * as tus from 'tus-js-client'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { createMediaRecord, getUploadPath, saveVideoThumbnail } from '@/app/actions/media'
import { captureVideoThumbnail } from '@/lib/captureVideoThumbnail'

const MAX_CONCURRENT = 3
const TUS_THRESHOLD_BYTES = 2 * 1024 * 1024 // 2 MB — use resumable TUS for anything ≥ 2 MB

export interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'
  progress: number
  bytesUploaded: number
  bytesTotal: number
  etaSeconds: number | null
  errorMessage: string | null
  mediaId: string | null
  storagePath: string | null
}

export interface UploadQueueState {
  files: UploadFile[]
  addFiles: (files: File[], eventId: string) => void
  removeFile: (id: string) => void
  retryFile: (id: string, eventId: string) => void
  clearCompleted: () => void
  hasActiveUploads: boolean
  showBackgroundWarning: boolean
}

// ---------------------------------------------------------------------------
// HEIC/HEIF → JPEG conversion (dynamically imported to stay browser-only)
// ---------------------------------------------------------------------------
async function normalizeFile(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)

  if (!isHeic) return file

  try {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(converted) ? converted[0] : converted
    return new File(
      [blob],
      file.name.replace(/\.(heic|heif)$/i, '.jpg'),
      { type: 'image/jpeg' }
    )
  } catch {
    return file // fall back to original on conversion failure
  }
}

async function captureAndUploadThumbnail(
  file: File,
  uploadId: string
): Promise<string | null> {
  const blob = await captureVideoThumbnail(file)
  if (!blob) return null

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const { path, error } = await saveVideoThumbnail(dataUrl, uploadId)
  if (error || !path) return null
  return path
}

function createUploadFile(file: File): UploadFile {
  return {
    id: crypto.randomUUID(),
    file,
    status: 'pending',
    progress: 0,
    bytesUploaded: 0,
    bytesTotal: file.size,
    etaSeconds: null,
    errorMessage: null,
    mediaId: null,
    storagePath: null,
  }
}

function formatFileType(mimeType: string): 'image' | 'video' {
  return mimeType.startsWith('video/') ? 'video' : 'image'
}

export function useUploadQueue(): UploadQueueState {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [showBackgroundWarning, setShowBackgroundWarning] = useState(false)
  const queryClient = useQueryClient()

  // Map from file id -> active tus.Upload instance
  const tusUploads = useRef<Map<string, tus.Upload>>(new Map())
  // Map from file id -> upload start timestamp (ms)
  const startTimes = useRef<Map<string, number>>(new Map())
  // WakeLock sentinel (Chrome Android; graceful no-op everywhere else)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null)
  // Ref so visibilitychange handler can read current value without closure staleness
  const hasActiveRef = useRef(false)

  const hasActiveUploads = files.some(
    (f) => f.status === 'uploading' || f.status === 'processing'
  )

  // Keep ref in sync
  useEffect(() => { hasActiveRef.current = hasActiveUploads }, [hasActiveUploads])

  // Warn on navigation if uploads are in progress
  useEffect(() => {
    if (!hasActiveUploads) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue =
        'Uploads are still in progress. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasActiveUploads])

  // Acquire WakeLock while uploads are active; release when idle
  useEffect(() => {
    if (!hasActiveUploads) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
      return
    }
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(navigator as any).wakeLock.request('screen')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((lock: any) => { wakeLockRef.current = lock })
        .catch(() => {})
    }
  }, [hasActiveUploads])

  // Visibility change: warn when hidden, toast + re-acquire WakeLock when visible
  useEffect(() => {
    const handle = () => {
      if (document.hidden) {
        if (hasActiveRef.current) setShowBackgroundWarning(true)
      } else {
        if (hasActiveRef.current) {
          toast.info('Upload resumed — keep this tab open to finish uploading.')
          // Re-acquire WakeLock (browser releases it automatically when hidden)
          if ('wakeLock' in navigator) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(navigator as any).wakeLock.request('screen')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .then((lock: any) => { wakeLockRef.current = lock })
              .catch(() => {})
          }
        }
        setShowBackgroundWarning(false)
      }
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [])

  const updateFile = useCallback(
    (id: string, patch: Partial<UploadFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
      )
    },
    []
  )

  // Core upload logic for a single file
  const startUpload = useCallback(
    async (fileEntry: UploadFile, eventId: string) => {
      const { id } = fileEntry

      // Normalize HEIC/HEIF → JPEG before anything else (iOS Camera Roll)
      const file = await normalizeFile(fileEntry.file)
      // If the file was converted, update the stored size
      if (file !== fileEntry.file) {
        updateFile(id, { bytesTotal: file.size })
      }

      // Get deterministic storage path from server
      const { path: storagePath, error: pathError } = await getUploadPath(
        eventId,
        file.name,
        file.type
      )

      if (pathError || !storagePath) {
        updateFile(id, {
          status: 'error',
          errorMessage: pathError ?? 'Failed to generate upload path.',
        })
        return
      }

      updateFile(id, { status: 'uploading', storagePath })
      startTimes.current.set(id, Date.now())

      // Adaptive chunk size: smaller chunks recover faster on cellular
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
      const chunkSize = isMobile ? 2 * 1024 * 1024 : 6 * 1024 * 1024

      // -----------------------------------------------------------------------
      // Large file: TUS resumable upload
      // -----------------------------------------------------------------------
      if (file.size > TUS_THRESHOLD_BYTES) {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          updateFile(id, {
            status: 'error',
            errorMessage: 'Not authenticated.',
          })
          return
        }

        const upload = new tus.Upload(file, {
          endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'event-media',
            objectName: storagePath,
            contentType: file.type,
            cacheControl: '3600',
          },
          chunkSize,

          onError(error) {
            tusUploads.current.delete(id)
            startTimes.current.delete(id)
            updateFile(id, {
              status: 'error',
              errorMessage: error.message ?? 'Upload failed.',
            })
          },

          onProgress(bytesUploaded, bytesTotal) {
            const startTime = startTimes.current.get(id)
            let etaSeconds: number | null = null
            if (startTime && bytesUploaded > 0) {
              const elapsedSec = (Date.now() - startTime) / 1000
              const rate = bytesUploaded / elapsedSec
              etaSeconds = rate > 0 ? (bytesTotal - bytesUploaded) / rate : null
            }
            const progress = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0
            updateFile(id, {
              progress,
              bytesUploaded,
              bytesTotal,
              etaSeconds: etaSeconds !== null ? Math.round(etaSeconds) : null,
            })
          },

          async onSuccess() {
            tusUploads.current.delete(id)
            startTimes.current.delete(id)

            // Mark as processing while we create the DB record
            updateFile(id, {
              progress: 100,
              bytesUploaded: file.size,
              status: 'processing',
              etaSeconds: null,
            })

            const thumbnailPath = file.type.startsWith('video/')
              ? await captureAndUploadThumbnail(file, id)
              : undefined

            const { media, error: recordError } = await createMediaRecord({
              event_id: eventId,
              storage_path: storagePath,
              file_type: formatFileType(file.type),
              mime_type: file.type,
              file_size_bytes: file.size,
              original_filename: file.name,
              ...(thumbnailPath != null && { thumbnail_path: thumbnailPath }),
            })

            if (recordError || !media) {
              updateFile(id, {
                status: 'error',
                errorMessage: recordError ?? 'Failed to save media record.',
              })
              return
            }

            updateFile(id, { status: 'done', mediaId: media.id })
            queryClient.invalidateQueries({ queryKey: ['gallery', eventId] })
            queryClient.invalidateQueries({ queryKey: ['visitor-gallery', eventId] })
          },
        })

        tusUploads.current.set(id, upload)
        upload.start()
        return
      }

      // -----------------------------------------------------------------------
      // Small file: regular Supabase Storage upload
      // -----------------------------------------------------------------------
      const supabase = createClient()

      updateFile(id, { bytesUploaded: 0, bytesTotal: file.size })

      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        startTimes.current.delete(id)
        updateFile(id, {
          status: 'error',
          errorMessage: uploadError.message,
        })
        return
      }

      startTimes.current.delete(id)
      updateFile(id, {
        progress: 100,
        bytesUploaded: file.size,
        status: 'processing',
        etaSeconds: null,
      })

      const thumbnailPath = file.type.startsWith('video/')
        ? await captureAndUploadThumbnail(file, id)
        : undefined

      const { media, error: recordError } = await createMediaRecord({
        event_id: eventId,
        storage_path: storagePath,
        file_type: formatFileType(file.type),
        mime_type: file.type,
        file_size_bytes: file.size,
        original_filename: file.name,
        ...(thumbnailPath != null && { thumbnail_path: thumbnailPath }),
      })

      if (recordError || !media) {
        updateFile(id, {
          status: 'error',
          errorMessage: recordError ?? 'Failed to save media record.',
        })
        return
      }

      updateFile(id, { status: 'done', mediaId: media.id })
      queryClient.invalidateQueries({ queryKey: ['gallery', eventId] })
      queryClient.invalidateQueries({ queryKey: ['visitor-gallery', eventId] })
    },
    [updateFile, queryClient]
  )

  // Process the queue: start up to MAX_CONCURRENT pending uploads
  const processQueue = useCallback(
    (currentFiles: UploadFile[], eventId: string) => {
      const active = currentFiles.filter(
        (f) => f.status === 'uploading' || f.status === 'processing'
      ).length
      const pending = currentFiles.filter((f) => f.status === 'pending')
      const slots = MAX_CONCURRENT - active

      if (slots <= 0 || pending.length === 0) return

      const toStart = pending.slice(0, slots)
      toStart.forEach((f) => startUpload(f, eventId))
    },
    [startUpload]
  )

  // Watch for pending files and dispatch uploads
  useEffect(() => {
    // We can't know the eventId here — processQueue is called explicitly
    // from addFiles and retryFile with the correct eventId.
  }, [])

  const addFiles = useCallback(
    (newFiles: File[], eventId: string) => {
      const entries = newFiles.map(createUploadFile)
      let latestFiles: UploadFile[] = []
      setFiles((prev) => {
        latestFiles = [...prev, ...entries]
        return latestFiles
      })
      setTimeout(() => processQueue(latestFiles, eventId), 0)
    },
    [processQueue]
  )

  const removeFile = useCallback((id: string) => {
    // Abort TUS upload if running
    const tusUpload = tusUploads.current.get(id)
    if (tusUpload) {
      tusUpload.abort(true).catch(() => {})
      tusUploads.current.delete(id)
    }
    startTimes.current.delete(id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const retryFile = useCallback(
    (id: string, eventId: string) => {
      let targetFile: UploadFile | undefined
      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'pending' as const,
                progress: 0,
                bytesUploaded: 0,
                etaSeconds: null,
                errorMessage: null,
                storagePath: null,
                mediaId: null,
              }
            : f
        )
        targetFile = updated.find((f) => f.id === id)
        return updated
      })
      setTimeout(() => {
        if (targetFile) startUpload(targetFile, eventId)
      }, 0)
    },
    [startUpload]
  )

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'done'))
  }, [])

  return {
    files,
    addFiles,
    removeFile,
    retryFile,
    clearCompleted,
    hasActiveUploads,
    showBackgroundWarning,
  }
}
