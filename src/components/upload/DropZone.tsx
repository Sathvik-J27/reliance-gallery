'use client'

import { useRef, useState, useCallback } from 'react'
import { UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5 GB

function validateAndFilter(fileList: FileList | File[]): File[] {
  const files = Array.from(fileList)
  const valid: File[] = []

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `"${file.name}" exceeds the 5 GB file size limit and was skipped.`
      )
    } else {
      valid.push(file)
    }
  }

  return valid
}

export default function DropZone({ onFilesSelected, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCount, setDragCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = validateAndFilter(files)
      if (valid.length > 0) {
        onFilesSelected(valid)
      }
    },
    [onFilesSelected]
  )

  // Drag events — use a counter to handle child element re-entrancy
  function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragCount((c) => c + 1)
    setIsDragOver(true)
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragCount((c) => {
      const next = c - 1
      if (next <= 0) setIsDragOver(false)
      return next
    })
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setDragCount(0)

    if (disabled) return
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      // Reset input so the same file can be added again if removed
      e.target.value = ''
    }
  }

  const draggingCount =
    isDragOver && dragCount > 0 ? dragCount : 0

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drop zone for photos and videos"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          fileInputRef.current?.click()
        }
      }}
      className={cn(
        'relative flex min-h-48 flex-col items-center justify-center gap-4',
        'rounded-xl border-2 border-dashed px-8 py-12',
        'transition-colors duration-200',
        isDragOver
          ? 'border-gold bg-gold/5'
          : 'border-brand-border bg-transparent hover:border-gold/50',
        disabled && 'pointer-events-none opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
      )}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
        aria-hidden="true"
      />
      {/* Camera input with capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
        aria-hidden="true"
      />

      {isDragOver ? (
        // Drag-over overlay content
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <UploadCloud className="h-10 w-10 text-gold" />
          <p className="font-inter text-base font-medium text-gold">
            {draggingCount > 0
              ? `Drop ${draggingCount} file${draggingCount !== 1 ? 's' : ''}`
              : 'Drop files here'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop UI */}
          <div className="hidden sm:flex flex-col items-center gap-4 w-full">
            <UploadCloud className="h-10 w-10 text-brand-text/40" />
            <p className="font-inter text-base text-brand-text/60">
              Drag photos &amp; videos here
            </p>
            <div className="flex items-center gap-3 w-full max-w-xs">
              <hr className="flex-1 border-brand-border" />
              <span className="font-inter text-xs text-brand-text/40 uppercase tracking-widest">
                or
              </span>
              <hr className="flex-1 border-brand-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              Choose Files
            </Button>
          </div>

          {/* Mobile UI */}
          <div className="flex sm:hidden flex-col items-center gap-3 w-full">
            <UploadCloud className="h-10 w-10 text-brand-text/40" />
            <p className="font-inter text-sm text-brand-text/60 text-center">
              Select photos &amp; videos to upload
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                Choose from Library
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full border border-brand-border"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled}
              >
                Use Camera
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
