'use client'

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function AuthStateSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['auth-user'] })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      }
    })
    return () => subscription.unsubscribe()
  }, [queryClient])

  return null
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthStateSync />
      {children}
    </QueryClientProvider>
  )
}
