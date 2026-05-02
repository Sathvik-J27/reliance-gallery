import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Reliance Surfaces — Event Gallery',
    template: '%s | Reliance Surfaces',
  },
  description:
    'Capture, share, and relive your most memorable events with Reliance Surfaces.',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-brand-bg text-brand-text font-sans antialiased">
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'var(--font-inter)',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
