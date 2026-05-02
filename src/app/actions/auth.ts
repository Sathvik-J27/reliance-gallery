'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(data: {
  email: string
  full_name: string
  password: string
}): Promise<{ error?: string }> {
  // Client-side validation is also applied, but double-check on server
  if (!data.email.endsWith('@reliancestones.com')) {
    return { error: 'Registration is restricted to @reliancestones.com email addresses.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
    },
  })

  if (error) {
    // Surface domain-trigger error cleanly
    if (error.message.includes('@reliancestones.com')) {
      return { error: 'Registration is restricted to @reliancestones.com email addresses.' }
    }
    return { error: error.message }
  }

  return {}
}

export async function signIn(data: {
  email: string
  password: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signInWithMagicLink(
  email: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function updatePassword(
  password: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
