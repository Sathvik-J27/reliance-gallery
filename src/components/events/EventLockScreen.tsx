'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { verifyEventCode } from '@/app/actions/events'

interface EventLockScreenProps {
  eventId: string
  eventName: string
  backHref: string
  backLabel?: string
}

export function EventLockScreen({
  eventId,
  eventName,
  backHref,
  backLabel = 'All events',
}: EventLockScreenProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setIsVerifying(true)
    try {
      const result = await verifyEventCode(eventId, code.trim())
      if (result.error) {
        toast.error(result.error)
        return
      }
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[70vh]">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 font-inter text-sm text-gray-500 hover:text-gold transition-colors mb-6 group self-start"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        {backLabel}
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 mb-6">
          <Lock className="h-10 w-10 text-gold" />
        </div>

        <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-brand-text mb-2">
          {eventName}
        </h1>

        <p className="font-inter text-sm text-gray-500 mb-8 max-w-xs">
          This event is private. Enter the access code to view its contents.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
          <Input
            type="password"
            placeholder="Access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          <Button
            type="submit"
            className="w-full"
            disabled={!code.trim() || isVerifying}
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Unlock'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
