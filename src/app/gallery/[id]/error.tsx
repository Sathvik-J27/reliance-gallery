'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function GalleryEventError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <ErrorFallback
        error={error}
        reset={reset}
        heading="Could not load this event"
        description="The event photos and videos could not be retrieved. It may have been removed, or there was a network issue."
        backHref="/gallery"
        backLabel="Back to Gallery"
      />
    </main>
  )
}
