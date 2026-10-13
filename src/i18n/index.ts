import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import ur from './ur.json'

const storageKey = 'language'

// localStorage throws in some private modes; the site must still work, in English.
function readSavedLanguage() {
  try {
    return localStorage.getItem(storageKey) === 'ur' ? 'ur' : 'en'
  } catch {
    return 'en'
  }
}

// Database text has _en and _ur columns; empty Urdu falls back to English.
export function localized(lng: string, en: string, ur: string) {
  return lng === 'ur' && ur ? ur : en
}

export function applyDocumentLanguage(lng: string) {
  document.documentElement.lang = lng
  document.documentElement.dir = i18n.dir(lng)
}

// Bundled resources make init synchronous, so lang and dir are set before the first render.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ur: { translation: ur } },
  lng: readSavedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React escapes rendered text
})

applyDocumentLanguage(i18n.language)

i18n.on('languageChanged', (lng) => {
  applyDocumentLanguage(lng)
  try {
    localStorage.setItem(storageKey, lng)
  } catch {
    // Not remembered, but still switched for this visit.
  }
})

export default i18n
