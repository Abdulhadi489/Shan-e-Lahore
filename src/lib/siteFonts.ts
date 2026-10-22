import i18n from '../i18n'
import { fontDefaults, fontLanguage, fontRoles, fontStack, googleFontsUrl, resolveFonts, type FontRole, type FontSettings } from './fonts'

// Puts the chosen site fonts on the page. The lists and rules are in fonts.ts.
const cssVariable = (role: FontRole) => `--font-${role.replace('_', '-')}`
const storageKey = 'font-settings'
const linkId = 'site-fonts'

// Names only. The last choice is remembered so the next visit shows the right fonts on the first paint,
// before the database answers.
function readRemembered() {
  try {
    return resolveFonts(JSON.parse(localStorage.getItem(storageKey) ?? 'null'))
  } catch {
    return fontDefaults
  }
}

let current = readRemembered()

// A bundled font needs no CSS variable: the fallback written in index.css is the original look. Any other choice
// sets the variable and loads its stylesheet, for the language on screen only.
function apply() {
  const root = document.documentElement
  for (const role of fontRoles) {
    if (current[role] === fontDefaults[role]) root.style.removeProperty(cssVariable(role))
    else root.style.setProperty(cssVariable(role), fontStack(role, current[role]))
  }

  const url = googleFontsUrl(current, [root.lang === 'ur' ? 'ur' : 'en'])
  const link = document.getElementById(linkId)
  if (link?.getAttribute('href') === url) return
  link?.remove()
  if (!url) return
  for (const [href, crossOrigin] of [['https://fonts.googleapis.com', null], ['https://fonts.gstatic.com', '']] as const) {
    if (document.head.querySelector(`link[rel=preconnect][href="${href}"]`)) continue
    const preconnect = document.createElement('link')
    preconnect.rel = 'preconnect'
    preconnect.href = href
    if (crossOrigin !== null) preconnect.crossOrigin = crossOrigin
    document.head.append(preconnect)
  }
  const stylesheet = document.createElement('link')
  stylesheet.id = linkId
  stylesheet.rel = 'stylesheet'
  stylesheet.href = url
  // Blocked or offline: go back to the bundled fonts for this visit instead of leaving fallback fonts.
  stylesheet.onerror = () => {
    const language = root.lang === 'ur' ? 'ur' : 'en'
    current = { ...current, ...Object.fromEntries(fontRoles.filter((role) => fontLanguage(role) === language).map((role) => [role, fontDefaults[role]])) }
    apply()
  }
  document.head.append(stylesheet)
}

export function setSiteFonts(next: FontSettings) {
  current = next
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {
    // Not remembered; the fonts still apply for this visit.
  }
  apply()
}

i18n.on('languageChanged', apply)
apply()
