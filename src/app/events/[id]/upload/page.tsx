import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEvent } from '@/app/actions/events'
import UploadPageClient from '@/components/upload/UploadPageClient'

interface UploadPageProps {
  params: { id: string }
}

export default async function UploadPage({ params }: UploadPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { event, error } = await getEvent(params.id)

  if (error || !event) {
    redirect(`/events/${params.id}`)
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-playfair text-3xl font-semibold text-brand-text mb-8">
          Upload to {event.name}
        </h1>
        <UploadPageClient eventId={event.id} eventName={event.name} />
      </div>
    </main>
  )
}
