import { Star } from 'lucide-react'
import { FavoritesGrid } from '@/components/gallery/FavoritesGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Favorites' }

export default function FavoritesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10">
            <Star className="h-4 w-4 text-gold" />
          </div>
          <h1 className="font-playfair text-3xl font-semibold text-brand-text tracking-tight">
            My Favorites
          </h1>
        </div>
        <p className="font-inter text-sm text-gray-500 ml-11">
          Media you&apos;ve starred across all events
        </p>
      </div>

      {/* Gold divider */}
      <div className="h-px bg-gradient-to-r from-gold/40 via-gold/20 to-transparent mb-8" />

      <FavoritesGrid />
    </main>
  )
}
