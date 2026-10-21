import { useId, type ReactNode } from 'react'

// A pointed Mughal arch, drawn in a 1 x 1 box so the same outline clips the content and draws the frame at any size.
const ARCH = 'M0 1V0.38C0 0.18 0.3 0.06 0.5 0C0.7 0.06 1 0.18 1 0.38V1Z'

// The contact map sits inside this arch with an orange outline; 360 x 420 at most.
export function ArchFrame({ children }: { children: ReactNode }) {
  // useId's punctuation is not safe inside url(#…).
  const clipId = `arch-${useId().replace(/\W/g, '')}`
  return (
    <div className="relative mx-auto aspect-[360/420] w-[min(100%,360px)] shrink-0">
      <svg aria-hidden className="absolute size-0">
        <clipPath id={clipId} clipPathUnits="objectBoundingBox">
          <path d={ARCH} />
        </clipPath>
      </svg>
      <div className="absolute inset-0 bg-brand" style={{ clipPath: `url(#${clipId})` }}>
        {children}
      </div>
      <svg aria-hidden viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible text-brand">
        <path d={ARCH} fill="none" stroke="currentColor" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
