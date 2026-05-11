import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { GalleryHeader } from '@/components/layout/GalleryHeader'
import { Footer } from '@/components/layout/Footer'
import { createServiceClient } from '@/lib/supabase/service'

export default async function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const cookieName = process.env.VISITOR_COOKIE_NAME ?? 'visitor_access'
  const storedVersion = cookieStore.get(cookieName)?.value

  if (!storedVersion) {
    redirect('/visitor')
  }

  const supabase = createServiceClient()
  const { data: currentVersion } = await supabase.rpc('get_code_version')

  if (currentVersion && storedVersion !== currentVersion) {
    redirect('/visitor')
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <GalleryHeader />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
