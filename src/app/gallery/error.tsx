'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function GalleryError({
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
        heading="Could not load gallery"
        description="The event gallery could not be loaded. Please try again."
        backHref="/visitor"
        backLabel="Re-enter access code"
      />
    </main>
  )
}
