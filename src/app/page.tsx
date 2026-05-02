import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <Header />

      <main className="flex flex-1 flex-col">
        {/* ── Hero ── */}
        <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-24 sm:py-32 lg:py-40">
          {/* Subtle background texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #C9A961 0px, #C9A961 1px, transparent 0px, transparent 50%)',
              backgroundSize: '20px 20px',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-3xl mx-auto">
            {/* Logo mark */}
            <div className="flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Reliance Surfaces"
                width={200}
                height={80}
                priority
                className="h-16 w-auto sm:h-20 object-contain"
              />
            </div>

            {/* Gold divider */}
            <div
              className="h-px w-24 bg-gold"
              aria-hidden="true"
            />

            {/* Headline */}
            <h1 className="font-playfair text-4xl font-bold leading-tight tracking-tight text-brand-text sm:text-5xl lg:text-6xl">
              Where Every Surface
              <br />
              <span className="text-gold">Tells a Story</span>
            </h1>

            {/* Subtitle */}
            <p className="max-w-xl font-inter text-base text-gray-500 sm:text-lg leading-relaxed">
              Capture, share, and relive your most memorable events.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 mt-4">
              <Button asChild size="lg" variant="default">
                <Link href="/login">Staff Login</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/visitor">Enter Gallery Code</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Gold accent divider ── */}
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
          <div className="mx-auto max-w-7xl">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
