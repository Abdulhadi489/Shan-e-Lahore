import { useId } from 'react'

// A traditional lace band: a gold vine with six-petal rosettes and leaves, over a scalloped lace edge, on espresso.
// One 56 x 32 tile repeats across the width. The scalloped edge is the bottom of the tile, so `flipped` turns the band
// upside down for use above the footer.
export function LaceTrim({ flipped = false }: { flipped?: boolean }) {
  const patternId = `lace-${useId().replace(/\W/g, '')}`
  return (
    <svg
      aria-hidden
      className={`block h-8 w-full bg-espresso text-gold ${flipped ? '-scale-y-100 border-b-2' : 'border-t-2'} border-gold`}
    >
      <defs>
        <pattern id={patternId} width="56" height="32" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M0 11Q14 3 28 11T56 11" />
            <path d="M0 25Q7 17 14 25Q21 17 28 25Q35 17 42 25Q49 17 56 25" />
            {[0, 60, 120, 180, 240, 300].map((turn) => (
              <ellipse key={turn} cx="28" cy="6" rx="2.2" ry="4.2" transform={`rotate(${turn} 28 11)`} />
            ))}
          </g>
          <circle cx="28" cy="11" r="2" className="fill-brand" />
          <path d="M14 7Q11 2 14 1Q17 2 14 7Z" fill="currentColor" />
          <path d="M42 15Q39 20 42 21Q45 20 42 15Z" fill="currentColor" />
          <g className="fill-brand">
            <circle cx="7" cy="27" r="1.3" />
            <circle cx="21" cy="27" r="1.3" />
            <circle cx="35" cy="27" r="1.3" />
            <circle cx="49" cy="27" r="1.3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}
