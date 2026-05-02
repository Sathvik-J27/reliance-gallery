'use client'

import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { verifyVisitorCode } from '@/app/actions/visitor'
import { cn } from '@/lib/utils'

const DIGITS = 6

export default function VisitorPage() {
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(DIGITS).fill(null))

  const code = digits.join('')
  const isFilled = code.length === DIGITS && digits.every((d) => d !== '')

  function focusAt(index: number) {
    inputRefs.current[index]?.focus()
    inputRefs.current[index]?.select()
  }

  function handleChange(index: number, value: string) {
    // Accept only a single digit
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError(null)

    if (digit && index < DIGITS - 1) {
      focusAt(index + 1)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current box
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        // Move to previous
        focusAt(index - 1)
        const next = [...digits]
        next[index - 1] = ''
        setDigits(next)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1)
    } else if (e.key === 'ArrowRight' && index < DIGITS - 1) {
      focusAt(index + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS)
    if (!pasted) return
    const next = Array(DIGITS).fill('')
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setDigits(next)
    setError(null)
    // Focus the next empty box or the last filled one
    const nextEmpty = next.findIndex((d) => d === '')
    focusAt(nextEmpty === -1 ? DIGITS - 1 : nextEmpty)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFilled || isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await verifyVisitorCode(code)
      if (result?.error) {
        setError(result.error)
        // Clear digits on wrong code
        setDigits(Array(DIGITS).fill(''))
        setTimeout(() => focusAt(0), 50)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-brand-border px-8 py-10">
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
        <h1 className="font-playfair text-3xl font-semibold text-brand-text text-center mb-2">
          Enter Gallery Code
        </h1>
        <p className="font-inter text-sm text-gray-500 text-center mb-8">
          Enter the 6-digit code to access the gallery.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Digit inputs */}
          {/* gap-1.5 on small screens keeps all 6 boxes within 295px card content area */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mb-6" role="group" aria-label="6-digit access code">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                aria-label={`Digit ${index + 1}`}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className={cn(
                  'flex-1 min-w-0 max-w-[44px] h-12 sm:h-14',
                  'rounded-lg border-2 text-center text-xl font-semibold font-inter text-brand-text',
                  'bg-white caret-gold',
                  'transition-colors duration-150',
                  'focus:outline-none',
                  error
                    ? 'border-red-400 focus:border-red-500'
                    : digit
                    ? 'border-gold'
                    : 'border-brand-border focus:border-gold focus:ring-2 focus:ring-gold/30'
                )}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 text-center mb-4 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!isFilled || isSubmitting}
          >
            {isSubmitting ? 'Verifying…' : 'Access Gallery'}
          </Button>
        </form>
      </div>
    </div>
  )
}
