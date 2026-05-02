'use client'

import { useState, useTransition, useRef } from 'react'
import { KeyRound, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { rotateVisitorCode } from '@/app/actions/admin'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface Props {
  codeLastUpdated: string | null
}

export function AccessCodeSection({ codeLastUpdated: initialUpdated }: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(initialUpdated)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const code = digits.join('')
  const isComplete = digits.every((d) => /^\d$/.test(d))

  function handleDigitInput(index: number, value: string) {
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const next = value.split('')
      setDigits(next)
      inputsRef.current[5]?.focus()
      return
    }
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handleConfirm() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await rotateVisitorCode(code)
      if (result.error) {
        setError(result.error)
        setConfirmOpen(false)
      } else {
        setSuccess(true)
        setConfirmOpen(false)
        setDigits(['', '', '', '', '', ''])
        setLastUpdated(new Date().toISOString())
        inputsRef.current[0]?.focus()
      }
    })
  }

  return (
    <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-brand-border">
        <KeyRound className="h-4 w-4 text-gold" />
        <h3 className="font-inter text-sm font-semibold text-brand-text">
          Visitor Access Code
        </h3>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Last updated info */}
        <div className="rounded-lg bg-gray-50 px-4 py-3">
          <p className="font-inter text-xs text-gray-500">
            Last rotated:{' '}
            <span className="font-medium text-brand-text">{formatDateTime(lastUpdated)}</span>
          </p>
          <p className="mt-1 font-inter text-xs text-gray-400">
            Rotating the code invalidates all active visitor sessions immediately.
          </p>
        </div>

        {/* Digit input */}
        <div>
          <label className="block font-inter text-sm font-medium text-brand-text mb-3">
            New 6-digit code
          </label>
          <div className="flex gap-2 sm:gap-3">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el }}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={cn(
                  'h-14 w-full max-w-[52px] rounded-lg border-2 text-center',
                  'font-inter text-xl font-bold text-brand-text',
                  'transition-colors focus:outline-none',
                  digit
                    ? 'border-gold bg-gold/5'
                    : 'border-brand-border bg-white',
                  'focus:border-gold'
                )}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
          <p className="mt-2 font-inter text-xs text-gray-400">
            You can also paste a 6-digit code directly into the first box.
          </p>
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="font-inter text-sm text-green-700">
              Visitor access code updated. All existing sessions have been invalidated.
            </p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="font-inter text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!isComplete || pending}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-5 py-2.5',
            'bg-gold text-black font-inter text-sm font-medium',
            'hover:bg-gold-hover transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', pending && 'animate-spin')} />
          {pending ? 'Rotating…' : 'Rotate Access Code'}
        </button>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Rotate Access Code?
            </DialogTitle>
            <DialogDescription>
              The new visitor code will be{' '}
              <span className="font-mono font-bold text-brand-text tracking-widest">
                {code}
              </span>
              . All visitors currently logged in will be signed out and will need to
              re-enter the new code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button
                className={cn(
                  'rounded-lg px-4 py-2 font-inter text-sm font-medium',
                  'border border-brand-border text-brand-text',
                  'hover:bg-gray-50 transition-colors'
                )}
              >
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleConfirm}
              disabled={pending}
              className={cn(
                'rounded-lg px-4 py-2 font-inter text-sm font-medium',
                'bg-gold text-black hover:bg-gold-hover transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {pending ? 'Rotating…' : 'Yes, rotate code'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
