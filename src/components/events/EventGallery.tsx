'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MediaGrid } from '@/components/gallery/MediaGrid'
import { FilterBar } from '@/components/gallery/FilterBar'
import { getEventUploaders } from '@/app/actions/media'
import type { GalleryFilters } from '@/hooks/useGalleryMedia'

interface EventGalleryProps {
  eventId: string
  isAuthenticated: boolean
}

export function EventGallery({ eventId, isAuthenticated }: EventGalleryProps) {
  const [filters, setFilters] = useState<GalleryFilters>({})

  const { data: uploadersData, isLoading: isLoadingUploaders } = useQuery({
    queryKey: ['uploaders', eventId],
    queryFn: () => getEventUploaders(eventId),
    staleTime: 5 * 60_000,
  })

  const uploaders = uploadersData?.uploaders ?? []

  return (
    <div className="space-y-4">
      <FilterBar
        fileType={filters.fileType}
        uploaderId={filters.uploaderId}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        uploaders={uploaders}
        isLoadingUploaders={isLoadingUploaders}
        onFileTypeChange={(val) => setFilters((f) => ({ ...f, fileType: val }))}
        onUploaderChange={(val) => setFilters((f) => ({ ...f, uploaderId: val }))}
        onDateFromChange={(val) => setFilters((f) => ({ ...f, dateFrom: val }))}
        onDateToChange={(val) => setFilters((f) => ({ ...f, dateTo: val }))}
        onClear={() => setFilters({})}
      />
      <MediaGrid eventId={eventId} isAuthenticated={isAuthenticated} filters={filters} />
    </div>
  )
}
