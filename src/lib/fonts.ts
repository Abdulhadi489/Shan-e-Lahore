// The fonts the Super Admin can choose for the customer site, and everything that turns a choice into CSS.
// Only names from these two lists ever reach the page: a stored name that is not here falls back to the default.
// The weights were checked against Google Fonts; add a font by adding one line (and its Urdu or English side stays separate).
export type FontEntry = { family: string; weights: readonly number[]; fallback: 'serif' | 'sans-serif' }

export const englishFonts: readonly FontEntry[] = [
  { family: 'Cormorant Garamond', weights: [400, 500, 600, 700], fallback: 'serif' },
  { family: 'Playfair Display', weights: [400, 500, 600, 700], fallback: 'serif' },
  { family: 'Lora', weights: [400, 500, 600, 700], fallback: 'serif' },
  { family: 'Merriweather', weights: [300, 400, 700, 900], fallback: 'serif' },
  { family: 'Libre Baskerville', weights: [400, 700], fallback: 'serif' },
  { family: 'Cinzel', weights: [400, 500, 600, 700], fallback: 'serif' },
  { family: 'EB Garamond', weights: [400, 500, 600, 700], fallback: 'serif' },
  { family: 'Crimson Text', weights: [400, 600, 700], fallback: 'serif' },
  { family: 'DM Serif Display', weights: [400], fallback: 'serif' },
  { family: 'Bitter', weights: [400, 500, 600, 700], fallback: 'serif' },
  { family: 'Abril Fatface', weights: [400], fallback: 'serif' },
  { family: 'Spectral', weights: [400, 500, 600, 700], fallback: 'serif' },
  { family: 'Jost', weights: [400, 500, 600, 700, 800], fallback: 'sans-serif' },
  { family: 'Poppins', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Montserrat', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Raleway', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Lato', weights: [400, 700], fallback: 'sans-serif' },
  { family: 'Open Sans', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Roboto', weights: [400, 500, 700], fallback: 'sans-serif' },
  { family: 'Nunito', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Nunito Sans', weights: [400, 600, 700], fallback: 'sans-serif' },
  { family: 'Inter', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Work Sans', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'DM Sans', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Mulish', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Source Sans 3', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Karla', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Rubik', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Oswald', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Bebas Neue', weights: [400], fallback: 'sans-serif' },
  { family: 'Barlow', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Barlow Condensed', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'PT Sans', weights: [400, 700], fallback: 'sans-serif' },
  { family: 'PT Sans Narrow', weights: [400, 700], fallback: 'sans-serif' },
  { family: 'Josefin Sans', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Quicksand', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Cabin', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
]

// Only fonts that draw Urdu letters. Nastaliq is the usual Urdu style; the others are Naskh and plain sans styles.
export const urduFonts: readonly FontEntry[] = [
  { family: 'Noto Nastaliq Urdu', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Gulzar', weights: [400], fallback: 'sans-serif' },
  { family: 'Noto Naskh Arabic', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Noto Sans Arabic', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Amiri', weights: [400, 700], fallback: 'sans-serif' },
  { family: 'Lateef', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Scheherazade New', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
  { family: 'Harmattan', weights: [400, 500, 600, 700], fallback: 'sans-serif' },
]

export const fontRoles = ['heading_en', 'body_en', 'heading_ur', 'body_ur'] as const
export type FontRole = (typeof fontRoles)[number]
export type FontSettings = Record<FontRole, string>

// What the site looked like before this setting existed. These four are bundled with the site (index.css), so they
// are never fetched from Google.
export const fontDefaults: FontSettings = {
  heading_en: 'Cormorant Garamond',
  body_en: 'Jost',
  heading_ur: 'Noto Nastaliq Urdu',
  body_ur: 'Noto Nastaliq Urdu',
}

export const fontLanguage = (role: FontRole) => (role.endsWith('_ur') ? 'ur' : 'en')
const listFor = (role: FontRole) => (fontLanguage(role) === 'ur' ? urduFonts : englishFonts)
const entryOf = (role: FontRole, family: string) => listFor(role).find((font) => font.family === family)

// Settings come from the database or from localStorage, so each name is checked against the lists.
export function resolveFonts(raw: Partial<Record<FontRole, unknown>> | null | undefined): FontSettings {
  const resolved = { ...fontDefaults }
  for (const role of fontRoles) {
    const value = raw?.[role]
    if (typeof value === 'string' && entryOf(role, value)) resolved[role] = value
  }
  return resolved
}

export function fontStack(role: FontRole, family: string) {
  const entry = entryOf(role, family) ?? entryOf(role, fontDefaults[role])
  return `'${entry?.family ?? fontDefaults[role]}', ${entry?.fallback === 'serif' ? 'ui-serif, Georgia, serif' : 'ui-sans-serif, system-ui, sans-serif'}`
}

// Headings ask for a semibold, body text for regular and medium, like the bundled fonts; a font without that
// weight gets its nearest one.
const wantedWeights = (role: FontRole) => (role.startsWith('heading') ? [600] : [400, 500])
const nearest = (available: readonly number[], wanted: number) =>
  available.reduce((best, weight) => (Math.abs(weight - wanted) < Math.abs(best - wanted) ? weight : best))

// One Google Fonts stylesheet for the chosen fonts of the given languages; null when all of them are bundled.
export function googleFontsUrl(settings: FontSettings, languages: readonly ('en' | 'ur')[]) {
  const families = new Map<string, Set<number>>()
  for (const role of fontRoles) {
    const family = settings[role]
    const entry = entryOf(role, family)
    if (!entry || family === fontDefaults[role] || !languages.includes(fontLanguage(role))) continue
    const weights = families.get(family) ?? new Set<number>()
    wantedWeights(role).forEach((wanted) => weights.add(nearest(entry.weights, wanted)))
    families.set(family, weights)
  }
  if (families.size === 0) return null
  const query = [...families]
    .map(([family, weights]) => `family=${family.replaceAll(' ', '+')}:wght@${[...weights].sort((a, b) => a - b).join(';')}`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${query}&display=swap`
}
