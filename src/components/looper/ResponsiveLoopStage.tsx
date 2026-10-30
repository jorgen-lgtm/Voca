'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Keep ring geometry intact while fitting the entire instrument into the viewport.
export function ResponsiveLoopStage({ size, children }: { size: number; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(320)
  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) setAvailable(width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const displayedSize = Math.min(size, available)
  return (
    <div ref={container} className="relative my-8 w-full overflow-hidden" style={{ maxWidth: size, height: displayedSize }}>
      <div className="absolute flex items-center justify-center" style={{ width: size, height: size, left: '50%', top: '50%', transform: `translate(-50%, -50%) scale(${displayedSize / size})` }}>
        {children}
      </div>
    </div>
  )
}
