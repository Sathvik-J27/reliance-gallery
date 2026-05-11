'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus } from 'lucide-react'
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
import { createManagedUser } from '@/app/actions/admin'
import type { Profile } from '@/types/database'

const schema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z
    .string()
    .email('Please enter a valid email.')
    .endsWith('@reliancestones.com', { message: 'Only @reliancestones.com addresses are allowed.' }),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['admin', 'staff']),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (profile: Profile) => void
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'staff' },
  })

  function onClose() {
    reset()
    setServerError(null)
    onOpenChange(false)
  }

  function onSubmit(data: FormValues) {
    setServerError(null)
    startTransition(async () => {
      const result = await createManagedUser(data)
      if (result.error) {
        setServerError(result.error)
      } else if (result.profile) {
        onCreated(result.profile)
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Add a new team member. They can sign in immediately with the password you set.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full Name</Label>
            <Input
              id="cu-name"
              placeholder="Jane Smith"
              hasError={!!errors.full_name}
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-xs text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              placeholder="jane@reliancestones.com"
              hasError={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password</Label>
            <Input
              id="cu-password"
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
            <Label htmlFor="cu-role">Role</Label>
            <select
              id="cu-role"
              {...register('role')}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm font-inter bg-white focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
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
              <UserPlus className="h-4 w-4" />
              {isPending ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
