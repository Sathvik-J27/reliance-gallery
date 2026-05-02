'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

async function fetchUser(): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export function useUser() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth-user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })

  return { user: user ?? null, isLoading }
}
