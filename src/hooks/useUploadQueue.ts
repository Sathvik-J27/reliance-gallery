'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createMediaRecord } from '@/app/actions/media'
import {
  initiateMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
} from '@/app/actions/upload'

const MAX_CONCURRENT = 5
const PART_SIZE = 8 * 1024 * 1024 // 8 MB — must match upload.ts

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
    return file
  }
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

// Upload a single part via XHR so we get real per-part progress.
function uploadPart(
  url: string,
  data: Blob,
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total)
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // R2 returns the ETag in the response header; strip surrounding quotes
        const etag = xhr.getResponseHeader('ETag')?.replace(/"/g, '') ?? ''
        resolve(etag)
      } else {
        reject(new Error(`Part upload failed: HTTP ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during part upload.')))
    xhr.addEventListener('abort', () => reject(new DOMException('Upload aborted.', 'AbortError')))

    signal.addEventListener('abort', () => xhr.abort())

    xhr.open('PUT', url)
    xhr.send(data)
  })
}

export function useUploadQueue(): UploadQueueState {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [showBackgroundWarning, setShowBackgroundWarning] = useState(false)
  const queryClient = useQueryClient()

  // Map from file id → AbortController (cancels in-flight XHR requests)
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  // Map from file id → { key, uploadId } for calling abortMultipartUpload on cancel
  const activeUploads = useRef<Map<string, { key: string; uploadId: string }>>(new Map())
  // Map from file id → upload start timestamp (ms)
  const startTimes = useRef<Map<string, number>>(new Map())
  // Refs for queue draining after each upload slot frees
  const filesRef = useRef<UploadFile[]>([])
  const eventIdRef = useRef<string | null>(null)
  const processQueueRef = useRef<((f: UploadFile[], eid: string) => void) | null>(null)
  // Tracks uploads actively in-flight to prevent double-starts on drain races
  const inProgressIds = useRef<Set<string>>(new Set())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null)
  const hasActiveRef = useRef(false)

  const hasActiveUploads = files.some(
    (f) => f.status === 'uploading' || f.status === 'processing'
  )

  useEffect(() => { hasActiveRef.current = hasActiveUploads }, [hasActiveUploads])

  // Keep filesRef current so drain callbacks always see the latest file states
  filesRef.current = files

  // Warn on navigation if uploads are in progress
  useEffect(() => {
    if (!hasActiveUploads) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = 'Uploads are still in progress. Are you sure you want to leave?'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasActiveUploads])

  // Acquire WakeLock while uploads are active
  useEffect(() => {
    if (!hasActiveUploads) {
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

  // Visibility change: warn when hidden, re-acquire WakeLock when visible
  useEffect(() => {
    const handle = () => {
      if (document.hidden) {
        if (hasActiveRef.current) setShowBackgroundWarning(true)
      } else {
        if (hasActiveRef.current) {
          toast.info('Upload resumed — keep this tab open to finish uploading.')
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
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    },
    []
  )

  // Core upload logic for a single file — R2 S3 multipart
  const drainQueue = (eventId: string) => {
    setTimeout(() => {
      if (processQueueRef.current) processQueueRef.current(filesRef.current, eventId)
    }, 0)
  }

  const startUpload = useCallback(
    async (fileEntry: UploadFile, eventId: string) => {
      const { id } = fileEntry

      if (inProgressIds.current.has(id)) return
      inProgressIds.current.add(id)

      const file = await normalizeFile(fileEntry.file)
      if (file !== fileEntry.file) {
        updateFile(id, { bytesTotal: file.size })
      }

      updateFile(id, { status: 'uploading' })
      startTimes.current.set(id, Date.now())

      // 1. Request presigned part URLs from the server
      const { key, uploadId, partUrls, error: initError } =
        await initiateMultipartUpload(eventId, file.name, file.type, file.size)

      if (initError || !key || !uploadId || !partUrls) {
        updateFile(id, {
          status: 'error',
          errorMessage: initError ?? 'Failed to initiate upload.',
        })
        startTimes.current.delete(id)
        inProgressIds.current.delete(id)
        drainQueue(eventId)
        return
      }

      updateFile(id, { storagePath: key })
      activeUploads.current.set(id, { key, uploadId })

      const controller = new AbortController()
      abortControllers.current.set(id, controller)

      // Bytes uploaded across all completed parts
      let committedBytes = 0
      // Per-part in-flight progress
      const partProgress: number[] = new Array(partUrls.length).fill(0)

      const onPartProgress = (partIndex: number, loaded: number) => {
        partProgress[partIndex] = loaded
        const totalLoaded = committedBytes + partProgress.reduce((a, b) => a + b, 0)
        const startTime = startTimes.current.get(id)
        let etaSeconds: number | null = null
        if (startTime && totalLoaded > 0) {
          const elapsedSec = (Date.now() - startTime) / 1000
          const rate = totalLoaded / elapsedSec
          etaSeconds = rate > 0 ? (file.size - totalLoaded) / rate : null
        }
        updateFile(id, {
          progress: Math.round((totalLoaded / file.size) * 100),
          bytesUploaded: totalLoaded,
          etaSeconds: etaSeconds !== null ? Math.round(etaSeconds) : null,
        })
      }

      // 2. Upload parts sequentially (avoids saturating mobile connections)
      const completedParts: { PartNumber: number; ETag: string }[] = []
      try {
        for (let i = 0; i < partUrls.length; i++) {
          const start = i * PART_SIZE
          const end = Math.min(start + PART_SIZE, file.size)
          const chunk = file.slice(start, end)

          const etag = await uploadPart(
            partUrls[i],
            chunk,
            (loaded) => onPartProgress(i, loaded),
            controller.signal
          )

          // Once committed, roll loaded bytes into committedBytes
          committedBytes += end - start
          partProgress[i] = 0
          completedParts.push({ PartNumber: i + 1, ETag: etag })
        }
      } catch (err) {
        abortControllers.current.delete(id)
        startTimes.current.delete(id)
        inProgressIds.current.delete(id)

        if (err instanceof DOMException && err.name === 'AbortError') {
          // User cancelled — server-side cleanup handled by removeFile
          drainQueue(eventId)
          return
        }

        // Network / HTTP error — abort the multipart upload so R2 doesn't
        // keep orphaned parts
        await abortMultipartUpload(key, uploadId).catch(() => {})
        activeUploads.current.delete(id)

        updateFile(id, {
          status: 'error',
          errorMessage: (err as Error).message ?? 'Upload failed.',
        })
        drainQueue(eventId)
        return
      }

      abortControllers.current.delete(id)
      activeUploads.current.delete(id)

      // 3. Finalize the multipart upload
      const { error: completeError } = await completeMultipartUpload(
        key,
        uploadId,
        completedParts
      )

      if (completeError) {
        startTimes.current.delete(id)
        inProgressIds.current.delete(id)
        updateFile(id, { status: 'error', errorMessage: completeError })
        drainQueue(eventId)
        return
      }

      // 4. Create the DB record and enqueue processing job
      updateFile(id, {
        progress: 100,
        bytesUploaded: file.size,
        status: 'processing',
        etaSeconds: null,
      })

      const { media, error: recordError } = await createMediaRecord({
        event_id: eventId,
        storage_path: key,
        file_type: formatFileType(file.type),
        mime_type: file.type,
        file_size_bytes: file.size,
        original_filename: file.name,
      })

      startTimes.current.delete(id)
      inProgressIds.current.delete(id)

      if (recordError || !media) {
        updateFile(id, {
          status: 'error',
          errorMessage: recordError ?? 'Failed to save media record.',
        })
        drainQueue(eventId)
        return
      }

      updateFile(id, { status: 'done', mediaId: media.id })
      queryClient.invalidateQueries({ queryKey: ['gallery', eventId] })
      queryClient.invalidateQueries({ queryKey: ['visitor-gallery', eventId] })
      drainQueue(eventId)
    },
    [updateFile, queryClient]
  )

  const processQueue = useCallback(
    (currentFiles: UploadFile[], eventId: string) => {
      const active = inProgressIds.current.size
      const pending = currentFiles.filter(
        (f) => f.status === 'pending' && !inProgressIds.current.has(f.id)
      )
      const slots = MAX_CONCURRENT - active
      if (slots <= 0 || pending.length === 0) return
      pending.slice(0, slots).forEach((f) => startUpload(f, eventId))
    },
    [startUpload]
  )
  processQueueRef.current = processQueue

  const addFiles = useCallback(
    (newFiles: File[], eventId: string) => {
      eventIdRef.current = eventId
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
    // Cancel in-flight XHR parts
    abortControllers.current.get(id)?.abort()
    abortControllers.current.delete(id)

    // Tell R2 to clean up orphaned parts
    const upload = activeUploads.current.get(id)
    if (upload) {
      abortMultipartUpload(upload.key, upload.uploadId).catch(() => {})
      activeUploads.current.delete(id)
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
