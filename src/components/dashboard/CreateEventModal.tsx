'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
import { createEvent } from '@/app/actions/events'

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

      toast.success('Event created successfully!')
      reset()
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
      if (!nextOpen) reset()
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
