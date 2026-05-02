'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

async function fetchProfile(): Promise<Profile | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) return null

  return data as Profile
}

export function useProfile() {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  return { profile: profile ?? null, isLoading, error }
}
