import { useId } from 'react'

// The three words of the shop's signboard, as outline calligraphy.
const words = [
  { text: 'ثقافت', x: 130, y: 120, size: 84, turn: -7 },
  { text: 'اپنائیت', x: 400, y: 250, size: 76, turn: 5 },
  { text: 'روایت', x: 150, y: 380, size: 80, turn: -4 },
]

// Cream page with the three words drawn as faint outline calligraphy, tiled behind every customer page. Outlines only
// (no fill) so it reads as a pen sketch; colour and strength come from the tokens here. The words are decoration,
// so they stay Urdu in both languages and are hidden from screen readers.
export function CalligraphyBackdrop() {
  const patternId = `calligraphy-${useId().replace(/\W/g, '')}`
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-surface">
      <svg className="size-full text-sketch opacity-30">
        <defs>
          <pattern id={patternId} width="560" height="470" patternUnits="userSpaceOnUse">
            {words.map(({ text, x, y, size, turn }) => (
              <text
                key={text}
                lang="ur"
                direction="rtl"
                textAnchor="middle"
                transform={`rotate(${turn} ${x} ${y})`}
                x={x}
                y={y}
                fontSize={size}
                fontFamily="'Noto Nastaliq Urdu'"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeLinejoin="round"
              >
                {text}
              </text>
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  )
}