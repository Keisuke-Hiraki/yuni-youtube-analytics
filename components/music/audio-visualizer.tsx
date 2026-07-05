'use client'

export const AudioVisualizer = () => {
  // Pure CSS animation implementation: each bar animates with pseudo-random delay and duration
  // No JS state updates; animation runs entirely in CSS
  const bars = Array.from({ length: 32 }, (_, i) => i)

  return (
    <div className="flex items-end justify-center gap-1 h-32" aria-hidden="true">
      {bars.map((index) => (
        <div
          key={index}
          className="w-2 spectrum-bar rounded-t animate-spectrum-bar"
          style={{
            background: `hsl(${(index * 360) / 32}, 100%, 50%)`,
            filter: `drop-shadow(0 0 5px hsl(${(index * 360) / 32}, 100%, 50%))`,
            animationDelay: `${index * -0.13}s`,
            animationDuration: `${0.8 + (index % 5) * 0.1}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
} 