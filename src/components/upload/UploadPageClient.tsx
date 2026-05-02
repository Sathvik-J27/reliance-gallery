'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useUploadQueue } from '@/hooks/useUploadQueue'
import DropZone from '@/components/upload/DropZone'
import UploadQueue from '@/components/upload/UploadQueue'

interface UploadPageClientProps {
  eventId: string
  eventName: string
}

const LARGE_FILE_THRESHOLD = 500 * 1024 * 1024 // 500 MB

export default function UploadPageClient({
  eventId,
  eventName,
}: UploadPageClientProps) {
  const {
    files,
    addFiles,
    removeFile,
    retryFile,
    clearCompleted,
    hasActiveUploads,
  } = useUploadQueue()

  // Browser confirm dialog on navigate-away during active uploads
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

  function handleFilesSelected(selected: File[]) {
    addFiles(selected, eventId)
  }

  // Find the largest queued file (any status except done/error removed)
  const largeFiles = files.filter(
    (f) =>
      f.file.size > LARGE_FILE_THRESHOLD &&
      f.status !== 'done' &&
      f.status !== 'error'
  )

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/events/${eventId}`}
        className="inline-flex items-center gap-2 text-sm text-brand-text/60 hover:text-brand-text transition-colors font-inter"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {eventName}
      </Link>

      {/* Large-file warning banner */}
      {largeFiles.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 font-inter">
          {largeFiles.map((f) => {
            const gb = (f.file.size / (1024 * 1024 * 1024)).toFixed(1)
            return (
              <p key={f.id}>
                Large file detected ({gb} GB) &mdash;{' '}
                <span className="font-medium">{f.file.name}</span>. Upload may
                take several minutes on mobile.
              </p>
            )
          })}
        </div>
      )}

      {/* Drop zone — always visible */}
      <DropZone
        onFilesSelected={handleFilesSelected}
        disabled={false}
      />

      {/* Upload queue */}
      {files.length > 0 && (
        <UploadQueue
          files={files}
          onRemove={removeFile}
          onRetry={(id) => retryFile(id, eventId)}
          onClearCompleted={clearCompleted}
        />
      )}
    </div>
  )
}
