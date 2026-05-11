export function VisitorWatermark({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 60px,
            rgba(0,0,0,0.5) 60px,
            rgba(0,0,0,0.5) 61px
          )`,
        }}
      />
      <span
        className="absolute bottom-2 right-2 text-white/30 text-xs font-mono"
        style={{ textShadow: '0 0 4px rgba(0,0,0,0.5)' }}
      >
        {label}
      </span>
    </div>
  )
}
