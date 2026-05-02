import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}
