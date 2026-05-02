'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, signInWithMagicLink } from '@/app/actions/auth'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const magicLinkSchema = z.object({
  magicEmail: z.string().email('Please enter a valid email address.'),
})

type MagicLinkFormValues = z.infer<typeof magicLinkSchema>

export default function LoginPage() {
  const [signInError, setSignInError] = useState<string | null>(null)
  const [magicError, setMagicError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSendingMagic, setIsSendingMagic] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerMagic,
    handleSubmit: handleSubmitMagic,
    formState: { errors: magicErrors },
    getValues: getMagicValues,
  } = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
  })

  async function onSignIn(data: LoginFormValues) {
    setSignInError(null)
    setIsSigningIn(true)
    try {
      const result = await signIn(data)
      if (result?.error) {
        setSignInError(result.error)
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  async function onMagicLink(data: MagicLinkFormValues) {
    setMagicError(null)
    setIsSendingMagic(true)
    try {
      const result = await signInWithMagicLink(data.magicEmail)
      if (result?.error) {
        setMagicError(result.error)
      } else {
        setMagicSent(true)
      }
    } finally {
      setIsSendingMagic(false)
    }
  }

  return (
    <AuthCard
      heading="Welcome Back"
      footerText="Don't have an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/signup"
    >
      {/* Sign-in form */}
      <form onSubmit={handleSubmit(onSignIn)} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@reliancestones.com"
            hasError={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            hasError={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        {signInError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {signInError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSigningIn}
        >
          {isSigningIn ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-brand-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400 font-inter tracking-wider">
            or
          </span>
        </div>
      </div>

      {/* Magic link */}
      {magicSent ? (
        <div className="text-center py-3 px-4 bg-gold/10 border border-gold/30 rounded-md">
          <p className="text-sm font-inter text-brand-text">
            Magic link sent! Check your inbox at{' '}
            <span className="font-medium">{getMagicValues('magicEmail')}</span>.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmitMagic(onMagicLink)}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="magicEmail">Email for magic link</Label>
            <Input
              id="magicEmail"
              type="email"
              autoComplete="email"
              placeholder="you@reliancestones.com"
              hasError={!!magicErrors.magicEmail}
              {...registerMagic('magicEmail')}
            />
            {magicErrors.magicEmail && (
              <p className="text-xs text-red-600 mt-1">
                {magicErrors.magicEmail.message}
              </p>
            )}
          </div>

          {magicError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {magicError}
            </p>
          )}

          <Button
            type="submit"
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isSendingMagic}
          >
            {isSendingMagic ? 'Sending…' : 'Send Magic Link'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
