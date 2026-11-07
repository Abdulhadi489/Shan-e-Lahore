// The restaurant's social accounts and email, shared by the footer and the contact page.
export const social = {
  instagram: { handle: '@shanelahoreofficial', url: 'https://www.instagram.com/shanelahoreofficial' },
  tiktok: { handle: '@shanelahoreofficial', url: 'https://www.tiktok.com/@shanelahoreofficial' },
  email: 'visitshanelahore@gmail.com',
}

// lucide-react has no brand icons, so these two are drawn in lucide's outline style (24 px grid, 2 px round strokes).
const outline = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg {...outline} className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  )
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg {...outline} className={className}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  )
}
