'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { signOut } from '@/app/actions/auth'

export function GalleryHeader() {
  const router = useRouter()
  const { user, isLoading } = useUser()

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

        {!isLoading && user && (
          <button
            onClick={handleSignOut}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2',
              'text-sm font-medium font-inter text-red-600',
              'hover:bg-red-50 transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
            )}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        )}
      </div>
    </header>
  )
}
