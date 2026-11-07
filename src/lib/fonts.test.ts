import { describe, expect, it } from 'vitest'
import { englishFonts, fontDefaults, googleFontsUrl, resolveFonts, urduFonts } from './fonts'

describe('resolveFonts', () => {
  it('keeps listed names and falls back to the default for anything else', () => {
    const resolved = resolveFonts({ heading_en: 'Lora', body_en: 'x;}body{display:none', heading_ur: 'Lora', body_ur: 42 })
    expect(resolved).toEqual({ ...fontDefaults, heading_en: 'Lora' })
  })

  it('accepts a missing value', () => {
    expect(resolveFonts(null)).toEqual(fontDefaults)
  })
})

describe('googleFontsUrl', () => {
  it('asks for nothing when the bundled fonts are chosen', () => {
    expect(googleFontsUrl(fontDefaults, ['en', 'ur'])).toBeNull()
  })

  it('asks only for the language on screen, with the nearest weights', () => {
    const settings = { ...fontDefaults, heading_en: 'Playfair Display', body_en: 'Lato', body_ur: 'Amiri' }
    expect(googleFontsUrl(settings, ['en'])).toBe(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Lato:wght@400&display=swap',
    )
    expect(googleFontsUrl(settings, ['ur'])).toBe('https://fonts.googleapis.com/css2?family=Amiri:wght@400&display=swap')
  })

  it('merges the weights when heading and body use the same font', () => {
    const settings = { ...fontDefaults, heading_en: 'Lora', body_en: 'Lora' }
    expect(googleFontsUrl(settings, ['en'])).toBe('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap')
  })
})

// The database only accepts the fonts listed in its CHECK constraints, so the website's lists must be the same names.
// The latest migration that defines the constraints is the one that counts.
describe('allowed fonts in the database', () => {
  const migrations = import.meta.glob<string>('../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true })
  const sql = Object.entries(migrations)
    .filter(([, text]) => text.includes('site_settings_english_fonts_allowed'))
    .sort(([a], [b]) => a.localeCompare(b))
    .at(-1)?.[1]

  // Each constraint lists its fonts twice, once for the heading column and once for the body column.
  const namesIn = (constraint: string) => {
    const text = sql ?? ''
    const start = text.indexOf(`constraint ${constraint} check (`)
    // The constraint closes with a line holding two spaces and a bracket.
    const end = text.indexOf('\n  )', start)
    return [...text.slice(start, end).matchAll(/'([^']+)'/g)].map((match) => match[1])
  }

  it('match the website lists', () => {
    expect(sql).toBeDefined()
    expect(namesIn('site_settings_english_fonts_allowed')).toEqual([...englishFonts, ...englishFonts].map((font) => font.family))
    expect(namesIn('site_settings_urdu_fonts_allowed')).toEqual([...urduFonts, ...urduFonts].map((font) => font.family))
  })
})
