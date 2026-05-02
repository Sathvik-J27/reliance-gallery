'use client'

import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  heading?: string
  description?: string
  backHref?: string
  backLabel?: string
}

export function ErrorFallback({
  error,
  reset,
  heading = 'Something went wrong',
  description,
  backHref = '/dashboard',
  backLabel = 'Go to Dashboard',
}: ErrorFallbackProps) {
  const message =
    description ??
    (process.env.NODE_ENV === 'development' && error?.message
      ? error.message
      : 'An unexpected error occurred. Please try again or go back.')

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-16 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 mb-5">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>

      <div className="h-0.5 w-12 bg-gradient-to-r from-gold to-gold/30 rounded-full mb-5" />

      <h2 className="font-playfair text-2xl font-semibold text-brand-text mb-3">
        {heading}
      </h2>

      <p className="font-inter text-sm text-gray-500 max-w-sm mb-8 leading-relaxed">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>

        <Button variant="outline" className="border-brand-border hover:bg-gray-50 hover:text-brand-text" asChild>
          <Link href={backHref}>
            <Home className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
    </div>
  )
}
