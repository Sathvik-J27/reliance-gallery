'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/app/actions/auth'

const signUpSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
    email: z
      .string()
      .email('Please enter a valid email address.')
      .endsWith('@reliancestones.com', {
        message: 'Only @reliancestones.com addresses are allowed.',
      }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.'),
    confirm_password: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

type SignUpFormValues = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(data: SignUpFormValues) {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const result = await signUp({
        email: data.email,
        full_name: data.full_name,
        password: data.password,
      })
      if (result?.error) {
        setServerError(result.error)
      } else {
        setSuccess(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <AuthCard
        heading="Check Your Email"
        footerText="Already confirmed?"
        footerLinkLabel="Sign in"
        footerLinkHref="/login"
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="font-inter text-sm text-gray-600 leading-relaxed">
            We sent a confirmation link to your inbox. Click it to activate your
            account and sign in.
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      heading="Create Account"
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkHref="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Full name */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            hasError={!!errors.full_name}
            {...register('full_name')}
          />
          {errors.full_name && (
            <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email{' '}
            <span className="text-gray-400 font-normal">
              (@reliancestones.com only)
            </span>
          </Label>
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

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            hasError={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            hasError={!!errors.confirm_password}
            {...register('confirm_password')}
          />
          {errors.confirm_password && (
            <p className="text-xs text-red-600 mt-1">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </AuthCard>
  )
}
