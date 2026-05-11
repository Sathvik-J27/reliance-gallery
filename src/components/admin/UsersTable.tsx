'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, User, ChevronDown, UserPlus, KeyRound } from 'lucide-react'
import { cn, formatShortDate } from '@/lib/utils'
import { updateUserRole } from '@/app/actions/admin'
import { CreateUserDialog } from './CreateUserDialog'
import { SetPasswordDialog } from './SetPasswordDialog'
import type { Profile } from '@/types/database'

function RoleBadge({ role }: { role: 'admin' | 'staff' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5',
        'font-inter text-xs font-medium',
        role === 'admin'
          ? 'bg-gold/15 text-amber-800'
          : 'bg-gray-100 text-gray-600'
      )}
    >
      {role === 'admin' ? (
        <ShieldCheck className="h-3 w-3" />
      ) : (
        <User className="h-3 w-3" />
      )}
      {role === 'admin' ? 'Admin' : 'Staff'}
    </span>
  )
}

interface RowProps {
  profile: Profile
  isSelf: boolean
  onRoleChange: (id: string, role: 'admin' | 'staff') => void
}

function UserRow({ profile, isSelf, onRoleChange }: RowProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pwOpen, setPwOpen] = useState(false)

  function toggle() {
    const next = profile.role === 'admin' ? 'staff' : 'admin'
    setError(null)
    startTransition(async () => {
      const result = await updateUserRole(profile.id, next)
      if (result.error) {
        setError(result.error)
      } else {
        onRoleChange(profile.id, next)
      }
    })
  }

  return (
    <>
      <tr className="border-b border-brand-border last:border-0 hover:bg-gray-50 transition-colors">
        {/* Name / email */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                'font-inter text-xs font-semibold',
                isSelf ? 'bg-gold text-black' : 'bg-brand-border text-gray-700'
              )}
            >
              {(profile.full_name ?? profile.email).slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-inter text-sm font-medium text-brand-text truncate">
                {profile.full_name ?? '—'}
                {isSelf && (
                  <span className="ml-2 font-normal text-xs text-gray-400">(you)</span>
                )}
              </p>
              <p className="font-inter text-xs text-gray-400 truncate">{profile.email}</p>
            </div>
          </div>
        </td>

        {/* Role badge */}
        <td className="px-4 py-3">
          <RoleBadge role={profile.role} />
        </td>

        {/* Joined */}
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="font-inter text-xs text-gray-500">{formatShortDate(profile.created_at)}</span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          {isSelf ? (
            <span className="font-inter text-xs text-gray-300">—</span>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPwOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                    'font-inter text-xs font-medium transition-colors',
                    'text-gray-600 hover:bg-gray-100 border border-gray-200'
                  )}
                >
                  <KeyRound className="h-3 w-3" />
                  Set Password
                </button>
                <button
                  onClick={toggle}
                  disabled={pending}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                    'font-inter text-xs font-medium transition-colors',
                    profile.role === 'admin'
                      ? 'text-red-600 hover:bg-red-50 border border-red-200'
                      : 'text-green-700 hover:bg-green-50 border border-green-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <ChevronDown className={cn('h-3 w-3 transition-transform', profile.role === 'staff' && 'rotate-180')} />
                  {pending
                    ? 'Saving…'
                    : profile.role === 'admin'
                    ? 'Demote to Staff'
                    : 'Promote to Admin'}
                </button>
              </div>
              {error && (
                <p className="font-inter text-xs text-red-500">{error}</p>
              )}
            </div>
          )}
        </td>
      </tr>

      <SetPasswordDialog
        open={pwOpen}
        onOpenChange={setPwOpen}
        userId={profile.id}
        userName={profile.full_name ?? profile.email}
      />
    </>
  )
}

interface Props {
  initialProfiles: Profile[]
  currentUserId: string
}

export function UsersTable({ initialProfiles, currentUserId }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [createOpen, setCreateOpen] = useState(false)

  function handleRoleChange(id: string, role: 'admin' | 'staff') {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role } : p))
    )
  }

  function handleUserCreated(profile: Profile) {
    setProfiles((prev) => [...prev, profile])
  }

  return (
    <>
      <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
          <h3 className="font-inter text-sm font-semibold text-brand-text">
            All Users
            <span className="ml-2 font-normal text-gray-400">({profiles.length})</span>
          </h3>
          <button
            onClick={() => setCreateOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2',
              'font-inter text-xs font-medium transition-colors',
              'bg-gold text-black hover:bg-gold/90'
            )}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-border bg-gray-50">
                <th className="px-4 py-3 text-left font-inter text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  User
                </th>
                <th className="px-4 py-3 text-left font-inter text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-inter text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Joined
                </th>
                <th className="px-4 py-3 text-right font-inter text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <UserRow
                  key={profile.id}
                  profile={profile}
                  isSelf={profile.id === currentUserId}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </tbody>
          </table>
        </div>

        {profiles.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="font-inter text-sm text-gray-400">No users found.</p>
          </div>
        )}
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleUserCreated}
      />
    </>
  )
}
