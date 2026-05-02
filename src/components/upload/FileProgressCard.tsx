'use client'

import { ImageIcon, VideoIcon, X, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { UploadFile } from '@/hooks/useUploadQueue'

interface FileProgressCardProps {
  file: UploadFile
  onRemove: () => void
  onRetry: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function truncate(str: string, max = 30): string {
  if (str.length <= max) return str
  const ext = str.includes('.') ? str.slice(str.lastIndexOf('.')) : ''
  const base = str.slice(0, max - ext.length - 1)
  return `${base}…${ext}`
}

function StatusText({ file }: { file: UploadFile }) {
  switch (file.status) {
    case 'pending':
      return (
        <span className="text-brand-text/40 font-inter text-xs">
          Waiting…
        </span>
      )

    case 'uploading': {
      const uploaded = formatBytes(file.bytesUploaded)
      const total = formatBytes(file.bytesTotal)
      const eta =
        file.etaSeconds !== null
          ? file.etaSeconds < 60
            ? `~${file.etaSeconds}s remaining`
            : `~${Math.round(file.etaSeconds / 60)}m remaining`
          : null
      return (
        <span className="text-brand-text/60 font-inter text-xs">
          {uploaded} of {total}
          {eta && <> &middot; {eta}</>}
        </span>
      )
    }

    case 'processing':
      return (
        <span className="text-brand-text/60 font-inter text-xs italic">
          Processing thumbnail…
        </span>
      )

    case 'done':
      return (
        <span className="flex items-center gap-1 text-green-600 font-inter text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Uploaded
        </span>
      )

    case 'error':
      return (
        <span className="text-red-500 font-inter text-xs">
          {file.errorMessage ?? 'Upload failed'}
        </span>
      )

    default:
      return null
  }
}

export default function FileProgressCard({
  file,
  onRemove,
  onRetry,
}: FileProgressCardProps) {
  const isImage = file.file.type.startsWith('image/')
  const canRemove =
    file.status === 'pending' ||
    file.status === 'done' ||
    file.status === 'error'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-brand-border bg-white px-4 py-3 shadow-sm">
      {/* File type icon */}
      <div className="mt-0.5 shrink-0 text-brand-text/30">
        {isImage ? (
          <ImageIcon className="h-5 w-5" />
        ) : (
          <VideoIcon className="h-5 w-5" />
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Filename + size */}
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-inter text-sm font-medium text-brand-text leading-tight truncate"
            title={file.file.name}
          >
            {truncate(file.file.name)}
          </span>
          <span className="shrink-0 font-inter text-xs text-brand-text/40">
            {formatBytes(file.bytesTotal)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              file.status === 'done'
                ? 'bg-green-500'
                : file.status === 'error'
                ? 'bg-red-400'
                : 'bg-gold'
            )}
            style={{ width: `${file.progress}%` }}
            role="progressbar"
            aria-valuenow={file.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        {/* Status text + retry button */}
        <div className="flex items-center justify-between gap-2">
          <StatusText file={file} />
          {file.status === 'error' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-xs text-gold hover:text-gold-hover"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.file.name}`}
          className={cn(
            'mt-0.5 shrink-0 rounded p-0.5',
            'text-brand-text/30 hover:text-brand-text/70',
            'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold'
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
