'use client'

import { useState } from 'react'
import { Users, KeyRound, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UsersTable } from './UsersTable'
import { AccessCodeSection } from './AccessCodeSection'
import { StatsCards } from './StatsCards'
import type { Profile } from '@/types/database'
import type { AdminStats } from '@/app/actions/admin'

type Tab = 'users' | 'access-code' | 'stats'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { id: 'access-code', label: 'Access Code', icon: <KeyRound className="h-4 w-4" /> },
  { id: 'stats', label: 'Statistics', icon: <BarChart3 className="h-4 w-4" /> },
]

interface Props {
  currentUserId: string
  initialProfiles: Profile[]
  initialStats: AdminStats | null
}

export function AdminPageClient({ currentUserId, initialProfiles, initialStats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-0 border-b border-brand-border mb-8 overflow-x-auto"
        role="tablist"
        aria-label="Admin sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 sm:px-6 py-3 shrink-0',
              'font-inter text-sm font-medium transition-colors',
              'border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset',
              activeTab === tab.id
                ? 'border-gold text-gold'
                : 'border-transparent text-gray-500 hover:text-brand-text hover:border-gray-300'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div role="tabpanel">
        {activeTab === 'users' && (
          <UsersTable
            initialProfiles={initialProfiles}
            currentUserId={currentUserId}
          />
        )}

        {activeTab === 'access-code' && (
          <AccessCodeSection
            codeLastUpdated={initialStats?.codeLastUpdated ?? null}
          />
        )}

        {activeTab === 'stats' && (
          initialStats ? (
            <StatsCards stats={initialStats} />
          ) : (
            <div className="rounded-xl border border-brand-border bg-white px-6 py-12 text-center">
              <p className="font-inter text-sm text-gray-400">
                Statistics could not be loaded. Please refresh the page.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
