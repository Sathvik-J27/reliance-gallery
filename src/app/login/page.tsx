'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [signInError, setSignInError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSignIn(data: LoginFormValues) {
    setSignInError(null)
    setIsSigningIn(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword(data)
      if (error) {
        setSignInError(error.message)
      } else {
        router.push('/dashboard')
      }
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <AuthCard heading="Welcome Back">
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
    </AuthCard>
  )
}
