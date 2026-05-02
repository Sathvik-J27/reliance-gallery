'use client'

import Link from 'next/link'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadFABProps {
  eventId: string
}

export function UploadFAB({ eventId }: UploadFABProps) {
  return (
    <>
      {/* Mobile FAB — fixed bottom-right */}
      <Link
        href={`/events/${eventId}/upload`}
        aria-label="Upload photos or videos"
        className={cn(
          'md:hidden',
          'fixed bottom-6 right-6 z-40',
          'flex h-14 w-14 items-center justify-center rounded-full',
          'bg-gold text-black shadow-lg',
          'hover:bg-gold-hover active:bg-gold-hover',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
        )}
      >
        <Upload className="h-6 w-6" />
      </Link>
    </>
  )
}

/**
 * Desktop upload button — rendered inline in the EventHeader toolbar.
 * Exported separately so EventHeader can place it in the right position.
 */
export function UploadButton({ eventId }: UploadFABProps) {
  return (
    <Link
      href={`/events/${eventId}/upload`}
      className={cn(
        'hidden md:inline-flex items-center gap-2',
        'h-10 rounded-md px-5 py-2',
        'bg-gold text-black text-sm font-medium font-inter',
        'hover:bg-gold-hover active:bg-gold-hover',
        'transition-colors duration-150 shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
      )}
    >
      <Upload className="h-4 w-4" />
      Upload
    </Link>
  )
}
