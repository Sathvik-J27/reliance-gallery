'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { getEventMediaPagePublic } from '@/app/actions/gallery'
import type { GalleryFilters } from '@/hooks/useGalleryMedia'

export function useVisitorGalleryMedia(eventId: string, filters?: GalleryFilters) {
  return useInfiniteQuery({
    queryKey: ['visitor-gallery', eventId, filters ?? {}],
    queryFn: ({ pageParam }) =>
      getEventMediaPagePublic(eventId, {
        cursor: pageParam as string | undefined,
        ...filters,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.pages
        .flatMap((p) => p.media)
        .some(
          (m) => m.processing_status === 'pending' || m.processing_status === 'processing'
        ) ?? false
      return hasPending ? 15_000 : false
    },
    refetchIntervalInBackground: false,
  })
}
