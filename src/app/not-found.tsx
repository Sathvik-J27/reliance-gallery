import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 text-center">

        <p className="font-playfair text-[8rem] sm:text-[10rem] font-bold leading-none text-gold/20 select-none mb-2">
          404
        </p>

        <div className="h-0.5 w-16 bg-gradient-to-r from-gold to-gold/30 rounded-full mb-8" />

        <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-brand-text mb-3">
          Page not found
        </h1>

        <p className="font-inter text-sm text-gray-500 max-w-sm mb-10 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Head back and try again.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" className="border-brand-border hover:bg-gray-50 hover:text-brand-text" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>

      </div>
    </main>
  )
}
