'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Images, Loader2 } from 'lucide-react'
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
import { deleteEvent } from '@/app/actions/events'
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
        {/* Top row: back link + actions */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            {/* Event name with gold underline accent */}
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

            {/* Date */}
            <p className="mt-3 font-inter text-sm text-gray-500">
              {formatEventDate(event.event_date)}
            </p>

            {/* Description */}
            {event.description && (
              <p className="mt-2 font-inter text-sm text-gray-700 max-w-2xl">
                {event.description}
              </p>
            )}

            {/* Media count */}
            <div className="mt-3 flex items-center gap-1.5 text-gray-500">
              <Images className="h-4 w-4 text-gold" />
              <span className="font-inter text-sm">{mediaLabel}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop upload button */}
            <UploadButton eventId={event.id} />

            {isAdmin && (
              <>
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
