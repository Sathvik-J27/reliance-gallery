'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'

export async function verifyVisitorCode(
  code: string
): Promise<{ error?: string }> {
  const supabase = createServiceClient()

  const { data: valid, error } = await supabase.rpc('verify_visitor_code', {
    input_code: code,
  })

  if (error) {
    return { error: 'An error occurred. Please try again.' }
  }

  if (!valid) {
    return { error: 'Incorrect code. Please try again.' }
  }

  const cookieName = process.env.VISITOR_COOKIE_NAME ?? 'visitor_access'
  const cookieStore = await cookies()

  cookieStore.set(cookieName, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  })

  redirect('/gallery')
}
