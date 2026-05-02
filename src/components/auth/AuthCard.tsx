import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AuthCardProps {
  heading: string
  children: React.ReactNode
  footerText?: string
  footerLinkLabel?: string
  footerLinkHref?: string
  className?: string
}

export function AuthCard({
  heading,
  children,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  className,
}: AuthCardProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div
        className={cn(
          'w-full max-w-md bg-white rounded-xl shadow-lg border border-brand-border',
          'px-8 py-10',
          className
        )}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Reliance Surfaces — Home">
            <Image
              src="/logo.png"
              alt="Reliance Surfaces"
              width={140}
              height={48}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Heading */}
        <h1 className="font-playfair text-3xl font-semibold text-brand-text text-center mb-8">
          {heading}
        </h1>

        {/* Content */}
        {children}

        {/* Footer link */}
        {footerText && footerLinkLabel && footerLinkHref && (
          <p className="mt-6 text-center text-sm font-inter text-gray-500">
            {footerText}{' '}
            <Link
              href={footerLinkHref}
              className="text-gold hover:text-gold-hover font-medium underline-offset-4 hover:underline transition-colors"
            >
              {footerLinkLabel}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
