'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, CalendarX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EventCard } from '@/components/dashboard/EventCard'
import { CreateEventModal } from '@/components/dashboard/CreateEventModal'
import type { EventWithCount } from '@/app/actions/events'

interface EventGridProps {
  events: EventWithCount[]
  isAdmin: boolean
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export function EventGrid({ events, isAdmin }: EventGridProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 200)

  const filtered = debouncedSearch.trim()
    ? events.filter((e) =>
        e.name.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
      )
    : events

  const handleSuccess = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-4"
            aria-label="Search events"
          />
        </div>

        {isAdmin && (
          <Button
            onClick={() => setModalOpen(true)}
            className="shrink-0"
            aria-label="Create new event"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        )}
      </div>

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <EmptyState isAdmin={isAdmin} hasSearch={debouncedSearch.trim().length > 0} />
      ) : (
        <div
          className={cn(
            'grid gap-6',
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {isAdmin && (
        <CreateEventModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

interface EmptyStateProps {
  isAdmin: boolean
  hasSearch: boolean
}

function EmptyState({ isAdmin, hasSearch }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 mb-5">
        <CalendarX className="h-8 w-8 text-gold" />
      </div>

      <h2 className="font-playfair text-xl font-semibold text-brand-text mb-2">
        {hasSearch ? 'No events found' : 'No events yet'}
      </h2>

      <p className="font-inter text-sm text-gray-500 max-w-xs">
        {hasSearch
          ? 'Try a different search term.'
          : isAdmin
          ? 'Create your first event to get started.'
          : 'Events will appear here once they are created.'}
      </p>
    </div>
  )
}
