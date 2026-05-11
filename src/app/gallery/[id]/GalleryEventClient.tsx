'use client'

import { useState } from 'react'
import { FilterBar } from '@/components/gallery/FilterBar'
import { VisitorMediaGrid } from '@/components/gallery/VisitorMediaGrid'
import type { GalleryFilters } from '@/hooks/useGalleryMedia'
import type { Profile } from '@/types/database'

interface GalleryEventClientProps {
  eventId: string
  uploaders: Pick<Profile, 'id' | 'full_name' | 'email'>[]
  visitorLabel: string
}

export function GalleryEventClient({ eventId, uploaders, visitorLabel }: GalleryEventClientProps) {
  const [fileType, setFileType] = useState<'image' | 'video' | undefined>()
  const [uploaderId, setUploaderId] = useState<string | undefined>()
  const [dateFrom, setDateFrom] = useState<string | undefined>()
  const [dateTo, setDateTo] = useState<string | undefined>()

  const filters: GalleryFilters = {
    ...(fileType && { fileType }),
    ...(uploaderId && { uploaderId }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  }

  function clearFilters() {
    setFileType(undefined)
    setUploaderId(undefined)
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  return (
    <div className="visitor-mode">
      {uploaders.length > 0 && (
        <div className="mb-5">
          <FilterBar
            fileType={fileType}
            uploaderId={uploaderId}
            dateFrom={dateFrom}
            dateTo={dateTo}
            uploaders={uploaders}
            isLoadingUploaders={false}
            onFileTypeChange={setFileType}
            onUploaderChange={setUploaderId}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onClear={clearFilters}
          />
        </div>
      )}

      <VisitorMediaGrid eventId={eventId} filters={filters} visitorLabel={visitorLabel} />
    </div>
  )
}
