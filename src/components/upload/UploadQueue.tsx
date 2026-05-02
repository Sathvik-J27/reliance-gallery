'use client'

import { Button } from '@/components/ui/button'
import type { UploadFile } from '@/hooks/useUploadQueue'
import FileProgressCard from '@/components/upload/FileProgressCard'

interface UploadQueueProps {
  files: UploadFile[]
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onClearCompleted: () => void
}

export default function UploadQueue({
  files,
  onRemove,
  onRetry,
  onClearCompleted,
}: UploadQueueProps) {
  const uploading = files.filter(
    (f) => f.status === 'uploading' || f.status === 'processing'
  ).length
  const done = files.filter((f) => f.status === 'done').length
  const hasDone = done > 0

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="font-inter text-sm text-brand-text/70">
          <span className="font-medium text-brand-text">{files.length}</span>
          {' '}file{files.length !== 1 ? 's' : ''}
          {uploading > 0 && (
            <>
              {' · '}
              <span className="font-medium text-brand-text">{uploading}</span>
              {' uploading'}
            </>
          )}
          {done > 0 && (
            <>
              {' · '}
              <span className="font-medium text-green-600">{done}</span>
              {' done'}
            </>
          )}
        </p>

        {hasDone && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCompleted}
            className="text-xs text-brand-text/50 hover:text-brand-text"
          >
            Clear completed
          </Button>
        )}
      </div>

      {/* File cards */}
      <ul className="space-y-2" aria-label="Upload queue">
        {files.map((file) => (
          <li key={file.id}>
            <FileProgressCard
              file={file}
              onRemove={() => onRemove(file.id)}
              onRetry={() => onRetry(file.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
