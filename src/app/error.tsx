'use client'

import { ErrorFallback } from '@/components/ui/ErrorFallback'

export default function RootError({
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
        backHref="/"
        backLabel="Go to home"
      />
    </main>
  )
}
