export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full border-t border-brand-border bg-brand-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-gray-500 font-inter">
          &copy; {year} Reliance Surfaces. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
