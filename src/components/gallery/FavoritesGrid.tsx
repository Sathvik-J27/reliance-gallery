'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { getUserFavorites, toggleFavorite } from '@/app/actions/favorites'
import { MediaTile } from './MediaTile'
import { GallerySkeleton } from './MediaSkeleton'
import { Lightbox } from './Lightbox'
import type { FavoriteMediaWithEvent } from '@/app/actions/favorites'
import type { MediaWithUploader } from '@/app/actions/media'

export function FavoritesGrid() {
  const queryClient = useQueryClient()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-favorites'],
    queryFn: async () => {
      const result = await getUserFavorites()
      if (result.error) throw new Error(result.error)
      return result.media
    },
    staleTime: 60_000,
  })

  const { mutate: toggle } = useMutation({
    mutationFn: (mediaId: string) => toggleFavorite(mediaId),
    onMutate: async (mediaId) => {
      await queryClient.cancelQueries({ queryKey: ['user-favorites'] })
      const prev = queryClient.getQueryData<FavoriteMediaWithEvent[]>(['user-favorites'])
      queryClient.setQueryData<FavoriteMediaWithEvent[]>(['user-favorites'], (old = []) =>
        old.filter((m) => m.id !== mediaId)
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['user-favorites'], ctx.prev)
    },
  })

  if (isLoading) return <GallerySkeleton />

  if (error) {
    return (
      <div className="py-24 text-center font-inter text-sm text-gray-500">
        Failed to load favorites. Please try again.
      </div>
    )
  }

  const allMedia = data ?? []

  if (!allMedia.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 mb-5">
          <Star className="h-8 w-8 text-gold" />
        </div>
        <h3 className="font-playfair text-xl font-semibold text-brand-text mb-2">
          No favorites yet
        </h3>
        <p className="font-inter text-sm text-gray-500 max-w-xs mb-6">
          Star photos and videos from any event and they&apos;ll appear here.
        </p>
        <Link
          href="/dashboard"
          className="font-inter text-sm font-medium text-gold hover:text-gold-hover underline underline-offset-4"
        >
          Browse events
        </Link>
      </div>
    )
  }

  // All items on this page are favorited — isFavorited always returns true
  const favoriteIds = new Set(allMedia.map((m) => m.id))

  return (
    <>
      <p className="font-inter text-sm text-gray-500 mb-4">
        {allMedia.length} {allMedia.length === 1 ? 'item' : 'items'} starred
      </p>

      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
        {allMedia.map((item, i) => (
          <MediaTile
            key={item.id}
            item={item as MediaWithUploader}
            onClick={() => setSelectedIndex(i)}
            isFavorited={true}
            onToggleFavorite={(e) => {
              e.stopPropagation()
              toggle(item.id)
            }}
            isAuthenticated={true}
            eventName={item.event?.name}
          />
        ))}
      </div>

      {selectedIndex !== null && (
        <Lightbox
          media={allMedia as MediaWithUploader[]}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          isFavorited={(id) => favoriteIds.has(id)}
          onToggleFavorite={toggle}
          isAuthenticated={true}
        />
      )}
    </>
  )
}
