'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '@/app/actions/auth'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setError(null)
    setLoading(true)
    try {
      const result = await updatePassword(data.password)
      if (result?.error) setError(result.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard heading="Set New Password">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            hasError={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            hasError={!!errors.confirm}
            {...register('confirm')}
          />
          {errors.confirm && (
            <p className="text-xs text-red-600 mt-1">{errors.confirm.message}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Saving…' : 'Set Password'}
        </Button>
      </form>
    </AuthCard>
  )
}
