import sketch from '../assets/lahore-sketch.svg'

// Cream page with the faint Badshahi Masjid line drawing (scripts/lahore-sketch.ts) behind every customer page.
// The drawing is a mask, so its colour and strength come from the tokens here; anchored to the bottom so the
// masjid sits on the "ground" on every screen size.
export function SkylineBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-surface">
      <div
        className="absolute inset-0 bg-skyline opacity-38 mask-cover mask-bottom mask-no-repeat"
        style={{ maskImage: `url(${sketch})` }}
      />
    </div>
  )
}
