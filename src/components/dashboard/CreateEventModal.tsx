'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createEvent, uploadEventCover } from '@/app/actions/events'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Event name is required')
    .max(120, 'Event name must be under 120 characters'),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  event_date: z.string().min(1, 'Event date is required'),
})

type FormValues = z.infer<typeof schema>

interface CreateEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateEventModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      event_date: '',
    },
  })

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const result = await createEvent({
        name: values.name,
        description: values.description || undefined,
        event_date: values.event_date,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (coverFile && result.event) {
        const fd = new FormData()
        fd.append('file', coverFile)
        await uploadEventCover(result.event.id, fd)
      }

      toast.success('Event created successfully!')
      reset()
      removeCover()
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!isSubmitting) {
      if (!nextOpen) {
        reset()
        removeCover()
      }
      onOpenChange(nextOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add a new event to organise photos and videos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {/* Event Name */}
          <div className="space-y-1.5">
            <Label htmlFor="event-name">
              Event Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="event-name"
              placeholder="e.g. Annual Company Retreat 2024"
              hasError={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-500 font-inter">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              placeholder="Optional — add a short description of the event"
              rows={3}
              hasError={!!errors.description}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-500 font-inter">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Event Date */}
          <div className="space-y-1.5">
            <Label htmlFor="event-date">
              Event Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="event-date"
              type="date"
              hasError={!!errors.event_date}
              {...register('event_date')}
            />
            {errors.event_date && (
              <p className="text-xs text-red-500 font-inter">
                {errors.event_date.message}
              </p>
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-1.5">
            <Label>
              Cover Image{' '}
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </Label>
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
                  onClick={removeCover}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  aria-label="Remove cover image"
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
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-border bg-gray-50 px-4 py-6 text-center transition-colors hover:border-gold/50 hover:bg-amber-50/30"
              >
                <ImagePlus className="h-7 w-7 text-gray-300" />
                <span className="font-inter text-xs text-gray-400">
                  Click to add a cover image
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
