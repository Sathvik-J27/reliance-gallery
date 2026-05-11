'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetUserPassword } from '@/app/actions/admin'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm: z.string().min(1, 'Please confirm the password.'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
}

export function SetPasswordDialog({ open, onOpenChange, userId, userName }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function onClose() {
    reset()
    setServerError(null)
    setSuccess(false)
    onOpenChange(false)
  }

  function onSubmit(data: FormValues) {
    setServerError(null)
    startTransition(async () => {
      const result = await resetUserPassword(userId, data.password)
      if (result.error) {
        setServerError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-medium text-brand-text">{userName}</span>.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              Password updated successfully.
            </p>
            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-password">New Password</Label>
              <Input
                id="sp-password"
                type="password"
                placeholder="Min. 8 characters"
                hasError={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-confirm">Confirm Password</Label>
              <Input
                id="sp-confirm"
                type="password"
                placeholder="Re-enter password"
                hasError={!!errors.confirm}
                {...register('confirm')}
              />
              {errors.confirm && (
                <p className="text-xs text-red-600">{errors.confirm.message}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {serverError}
              </p>
            )}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                <KeyRound className="h-4 w-4" />
                {isPending ? 'Saving…' : 'Set Password'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
