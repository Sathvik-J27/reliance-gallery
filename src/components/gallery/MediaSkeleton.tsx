export function GallerySkeleton() {
  // Varied aspect ratios to mimic a realistic masonry layout during load
  const ratios = ['4/3', '3/4', '16/9', '1/1', '3/4', '4/3', '1/1', '3/4', '4/3', '16/9', '1/1', '3/4']
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
      {ratios.map((ratio, i) => (
        <div key={i} className="break-inside-avoid mb-2">
          <div
            className="w-full bg-gray-100 animate-pulse rounded-sm"
            style={{ aspectRatio: ratio }}
          />
        </div>
      ))}
    </div>
  )
}
