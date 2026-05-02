'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Uploader {
  id: string
  full_name: string | null
  email: string
}

interface FilterBarProps {
  fileType?: 'image' | 'video'
  uploaderId?: string
  dateFrom?: string
  dateTo?: string
  uploaders: Uploader[]
  isLoadingUploaders: boolean
  onFileTypeChange: (val?: 'image' | 'video') => void
  onUploaderChange: (val?: string) => void
  onDateFromChange: (val?: string) => void
  onDateToChange: (val?: string) => void
  onClear: () => void
}

const TYPE_OPTS: { label: string; value?: 'image' | 'video' }[] = [
  { label: 'All' },
  { label: 'Photos', value: 'image' },
  { label: 'Videos', value: 'video' },
]

export function FilterBar({
  fileType,
  uploaderId,
  dateFrom,
  dateTo,
  uploaders,
  isLoadingUploaders,
  onFileTypeChange,
  onUploaderChange,
  onDateFromChange,
  onDateToChange,
  onClear,
}: FilterBarProps) {
  const hasFilters = !!fileType || !!uploaderId || !!dateFrom || !!dateTo

  return (
    <div className="border border-brand-border rounded-lg p-3 bg-white space-y-2.5">
      {/* Row 1: type pills + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-inter text-xs text-gray-400 shrink-0">Type</span>
        <div className="flex items-center gap-1.5">
          {TYPE_OPTS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => onFileTypeChange(opt.value)}
              className={cn(
                'font-inter text-xs px-3 py-1.5 rounded-full border transition-all duration-150 whitespace-nowrap',
                fileType === opt.value
                  ? 'bg-gold border-gold text-black font-medium'
                  : 'border-brand-border text-gray-600 hover:border-gold hover:text-gold'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={onClear}
            className="ml-auto flex items-center gap-1 font-inter text-xs text-gray-400 hover:text-gold transition-colors"
            aria-label="Clear all filters"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Row 2: uploader + date range */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={uploaderId ?? ''}
          onChange={(e) => onUploaderChange(e.target.value || undefined)}
          disabled={isLoadingUploaders || uploaders.length === 0}
          className="font-inter text-xs border border-brand-border rounded-md px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold disabled:opacity-40 min-w-[140px]"
        >
          <option value="">All uploaders</option>
          {uploaders.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.email.split('@')[0]}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom ?? ''}
            onChange={(e) => onDateFromChange(e.target.value || undefined)}
            className="font-inter text-xs border border-brand-border rounded-md px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold w-[130px]"
            aria-label="Date from"
          />
          <span className="font-inter text-xs text-gray-400">–</span>
          <input
            type="date"
            value={dateTo ?? ''}
            onChange={(e) => onDateToChange(e.target.value || undefined)}
            min={dateFrom}
            className="font-inter text-xs border border-brand-border rounded-md px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold w-[130px]"
            aria-label="Date to"
          />
        </div>
      </div>
    </div>
  )
}
