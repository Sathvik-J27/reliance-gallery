'use client'

import { ImageIcon, HardDrive, CalendarDays, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminStats } from '@/app/actions/admin'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  sub?: string
}

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-brand-border bg-white p-6',
        'flex items-start gap-4'
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-inter text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="font-playfair text-2xl font-bold text-brand-text">{value}</p>
        {sub && (
          <p className="mt-0.5 font-inter text-xs text-gray-400 truncate">{sub}</p>
        )}
      </div>
    </div>
  )
}

interface Props {
  stats: AdminStats
}

export function StatsCards({ stats }: Props) {
  return (
    <div className="space-y-6">
      {/* Top 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Files"
          value={stats.totalMedia.toLocaleString()}
          icon={<ImageIcon className="h-5 w-5" />}
          sub="photos & videos"
        />
        <StatCard
          label="Storage Used"
          value={formatBytes(stats.totalStorage)}
          icon={<HardDrive className="h-5 w-5" />}
          sub="across all events"
        />
        <StatCard
          label="Total Events"
          value={stats.totalEvents.toLocaleString()}
          icon={<CalendarDays className="h-5 w-5" />}
          sub="in the gallery"
        />
      </div>

      {/* Top uploaders */}
      <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-brand-border">
          <Trophy className="h-4 w-4 text-gold" />
          <h3 className="font-inter text-sm font-semibold text-brand-text">Top Uploaders</h3>
        </div>

        {stats.topUploaders.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-inter text-sm text-gray-400">No uploads yet.</p>
          </div>
        ) : (
          <ol className="divide-y divide-brand-border">
            {stats.topUploaders.map((u, idx) => (
              <li key={u.id} className="flex items-center gap-4 px-6 py-4">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    'font-inter text-xs font-bold',
                    idx === 0
                      ? 'bg-gold text-black'
                      : 'bg-brand-border text-gray-600'
                  )}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-inter text-sm font-medium text-brand-text truncate">
                    {u.full_name ?? u.email}
                  </p>
                  {u.full_name && (
                    <p className="font-inter text-xs text-gray-400 truncate">{u.email}</p>
                  )}
                </div>
                <span className="font-inter text-sm font-semibold text-brand-text shrink-0">
                  {u.count.toLocaleString()}{' '}
                  <span className="font-normal text-gray-400 text-xs">
                    {u.count === 1 ? 'file' : 'files'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
