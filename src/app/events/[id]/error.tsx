'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function EventError({
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
        heading="Could not load event"
        description="This event could not be loaded. It may have been removed, or there was a network error."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />
    </main>
  )
}
