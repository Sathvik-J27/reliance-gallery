'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Images, Loader2, ImagePlus, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { deleteEvent, uploadEventCover } from '@/app/actions/events'
import { UploadButton } from '@/components/events/UploadFAB'
import type { Event } from '@/types/database'

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface EventHeaderProps {
  event: Event
  mediaCount: number
  isAdmin: boolean
}

export function EventHeader({ event, mediaCount, isAdmin }: EventHeaderProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [coverDialogOpen, setCoverDialogOpen] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function resetCoverState() {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCoverUpload() {
    if (!coverFile) return
    setIsUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append('file', coverFile)
      const result = await uploadEventCover(event.id, fd)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Cover image updated.')
      setCoverDialogOpen(false)
      resetCoverState()
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsUploadingCover(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const result = await deleteEvent(event.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Event deleted.')
      setDeleteDialogOpen(false)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const mediaLabel =
    mediaCount === 1 ? '1 item' : `${mediaCount} items`

  return (
    <>
      <div className="border-b border-brand-border pb-6 mb-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-inter text-sm text-gray-500 hover:text-gold transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          All events
        </Link>

        {/* Top row: title + actions */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="relative inline-block">
              <h1
                className={cn(
                  'font-playfair text-3xl sm:text-4xl font-bold text-brand-text',
                  'leading-tight'
                )}
              >
                {event.name}
              </h1>
              <div className="mt-1 h-0.5 w-16 bg-gold rounded-full" />
            </div>

            <p className="mt-3 font-inter text-sm text-gray-500">
              {formatEventDate(event.event_date)}
            </p>

            {event.description && (
              <p className="mt-2 font-inter text-sm text-gray-700 max-w-2xl">
                {event.description}
              </p>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-gray-500">
              <Images className="h-4 w-4 text-gold" />
              <span className="font-inter text-sm">{mediaLabel}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <UploadButton eventId={event.id} />

            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Change cover image"
                  onClick={() => setCoverDialogOpen(true)}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Edit event"
                  onClick={() => router.push(`/events/${event.id}/edit`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="Delete event"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cover image dialog */}
      <Dialog
        open={coverDialogOpen}
        onOpenChange={(open) => {
          if (!isUploadingCover) {
            if (!open) resetCoverState()
            setCoverDialogOpen(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {event.cover_image_url ? 'Change Cover Image' : 'Add Cover Image'}
            </DialogTitle>
            <DialogDescription>
              This image appears on the event card in the gallery listing.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            {coverPreview ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-brand-border bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={resetCoverState}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  aria-label="Remove selected image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 font-inter text-xs text-white transition-colors hover:bg-black/70"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-border bg-gray-50 px-4 py-8 text-center transition-colors hover:border-gold/50 hover:bg-amber-50/30"
              >
                <ImagePlus className="h-8 w-8 text-gray-300" />
                <span className="font-inter text-xs text-gray-400">
                  Click to select an image
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverSelect}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetCoverState()
                setCoverDialogOpen(false)
              }}
              disabled={isUploadingCover}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCoverUpload}
              disabled={!coverFile || isUploadingCover}
            >
              {isUploadingCover ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                'Save Cover'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-brand-text">{event.name}</span>?
              This will permanently remove the event and all its media. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete Event'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
