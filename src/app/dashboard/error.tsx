'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function DashboardError({
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
        heading="Could not load dashboard"
        description="There was a problem fetching your events. Check your connection and try again."
        backHref="/"
        backLabel="Go to home"
      />
    </main>
  )
}
