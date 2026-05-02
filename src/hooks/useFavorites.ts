'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleFavorite, getEventFavoriteIds } from '@/app/actions/favorites'

export function useEventFavorites(eventId: string, isAuthenticated: boolean) {
  const queryClient = useQueryClient()

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorites', eventId],
    queryFn: async () => {
      const result = await getEventFavoriteIds(eventId)
      return result.ids ?? []
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const favoriteSet = new Set<string>(favoriteIds)

  const { mutate: toggle } = useMutation({
    mutationFn: (mediaId: string) => toggleFavorite(mediaId),
    onMutate: async (mediaId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', eventId] })
      const previous = queryClient.getQueryData<string[]>(['favorites', eventId])
      queryClient.setQueryData<string[]>(['favorites', eventId], (old = []) => {
        const has = old.includes(mediaId)
        return has ? old.filter((id) => id !== mediaId) : [...old, mediaId]
      })
      return { previous }
    },
    onError: (_err, _mediaId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['favorites', eventId], ctx.previous)
      }
    },
  })

  return { favoriteSet, toggleFavorite: toggle }
}
