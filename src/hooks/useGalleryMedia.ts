'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { getEventMediaPage } from '@/app/actions/media'

export interface GalleryFilters {
  fileType?: 'image' | 'video'
  uploaderId?: string
  dateFrom?: string
  dateTo?: string
}

export function useGalleryMedia(eventId: string, filters?: GalleryFilters) {
  return useInfiniteQuery({
    queryKey: ['gallery', eventId, filters ?? {}],
    queryFn: ({ pageParam }) =>
      getEventMediaPage(eventId, {
        cursor: pageParam as string | undefined,
        ...filters,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
  })
}
