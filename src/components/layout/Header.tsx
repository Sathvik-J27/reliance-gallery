'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ChevronDown, LogOut, User, ShieldCheck } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/hooks/useProfile'
import { signOut } from '@/app/actions/auth'

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function Header() {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user, isLoading: userLoading } = useUser()
  const { profile } = useProfile()

  const isAuthenticated = !!user
  const isHomePage = pathname === '/'

  async function handleSignOut() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full bg-brand-bg',
        'border-b-2 border-gold',
        'shadow-sm'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 rounded-sm"
          aria-label="Reliance Surfaces — Home"
        >
          <Image
            src="/logo.png"
            alt="Reliance Surfaces logo"
            width={120}
            height={40}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {!userLoading && !isHomePage && (
            <>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className={cn(
                      'text-sm font-medium font-inter text-brand-text',
                      'transition-colors duration-150',
                      'hover:text-gold',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm px-1'
                    )}
                  >
                    Dashboard
                  </Link>

                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin"
                      className={cn(
                        'flex items-center gap-1.5 text-sm font-medium font-inter text-brand-text',
                        'transition-colors duration-150',
                        'hover:text-gold',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm px-1'
                      )}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Admin
                    </Link>
                  )}

                  {/* User avatar dropdown */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        className={cn(
                          'flex items-center gap-2 rounded-full',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'
                        )}
                        aria-label="User menu"
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            'bg-gold text-black text-xs font-semibold font-inter',
                            'select-none'
                          )}
                        >
                          {getInitials(
                            profile?.full_name ?? null,
                            user?.email ?? ''
                          )}
                        </span>
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className={cn(
                          'z-50 min-w-[160px] rounded-xl bg-white shadow-lg',
                          'border border-brand-border p-1',
                          'data-[state=open]:animate-in data-[state=closed]:animate-out',
                          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                          'origin-top-right'
                        )}
                        align="end"
                        sideOffset={8}
                      >
                        {/* User info header */}
                        <div className="px-3 py-2 border-b border-brand-border mb-1">
                          <p className="text-xs font-semibold font-inter text-brand-text truncate">
                            {profile?.full_name ?? user?.email}
                          </p>
                          {profile?.full_name && (
                            <p className="text-xs font-inter text-gray-500 truncate">
                              {user?.email}
                            </p>
                          )}
                        </div>

                        <DropdownMenu.Item asChild>
                          <Link
                            href="/profile"
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-2',
                              'text-sm font-inter text-brand-text',
                              'hover:bg-brand-border cursor-pointer',
                              'focus-visible:outline-none focus-visible:bg-brand-border',
                              'transition-colors duration-150'
                            )}
                          >
                            <User className="h-4 w-4" />
                            Profile
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator className="my-1 h-px bg-brand-border" />

                        <DropdownMenu.Item asChild>
                          <button
                            onClick={handleSignOut}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-3 py-2',
                              'text-sm font-inter text-red-600',
                              'hover:bg-red-50 cursor-pointer',
                              'focus-visible:outline-none focus-visible:bg-red-50',
                              'transition-colors duration-150'
                            )}
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    'text-sm font-medium font-inter text-brand-text',
                    'transition-colors duration-150',
                    'hover:text-gold',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm px-1'
                  )}
                >
                  Sign In
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className={cn(
            isHomePage ? 'hidden' : 'md:hidden',
            'inline-flex items-center justify-center',
            'rounded-md p-2 text-brand-text',
            'hover:bg-brand-border hover:text-gold',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
          )}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && !isHomePage && (
        <div className="md:hidden border-t border-brand-border bg-brand-bg">
          <nav
            className="flex flex-col px-4 py-3 gap-1"
            aria-label="Mobile navigation"
          >
            {isAuthenticated ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 px-3 py-2 mb-1 border-b border-brand-border">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      'bg-gold text-black text-xs font-semibold font-inter',
                      'shrink-0'
                    )}
                  >
                    {getInitials(profile?.full_name ?? null, user?.email ?? '')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold font-inter text-brand-text truncate">
                      {profile?.full_name ?? user?.email}
                    </p>
                    {profile?.full_name && (
                      <p className="text-xs font-inter text-gray-500 truncate">
                        {user?.email}
                      </p>
                    )}
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className={cn(
                    'block rounded-md px-3 py-2',
                    'text-sm font-medium font-inter text-brand-text',
                    'hover:bg-brand-border hover:text-gold',
                    'transition-colors duration-150'
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>

                <Link
                  href="/profile"
                  className={cn(
                    'block rounded-md px-3 py-2',
                    'text-sm font-medium font-inter text-brand-text',
                    'hover:bg-brand-border hover:text-gold',
                    'transition-colors duration-150'
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Profile
                </Link>

                {profile?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2',
                      'text-sm font-medium font-inter text-brand-text',
                      'hover:bg-brand-border hover:text-gold',
                      'transition-colors duration-150'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileOpen(false)
                    handleSignOut()
                  }}
                  className={cn(
                    'block w-full text-left rounded-md px-3 py-2',
                    'text-sm font-medium font-inter text-red-600',
                    'hover:bg-red-50',
                    'transition-colors duration-150'
                  )}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={cn(
                  'block rounded-md px-3 py-2',
                  'text-sm font-medium font-inter text-brand-text',
                  'hover:bg-brand-border hover:text-gold',
                  'transition-colors duration-150'
                )}
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
