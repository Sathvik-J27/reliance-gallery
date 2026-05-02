'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function AdminError({
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
        heading="Admin panel error"
        description="There was a problem loading the admin panel. Please try again."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />
    </main>
  )
}
