import 'i18next'
import type en from './en.json'

// Makes t('some.key') a type error when the key is missing from en.json.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en }
  }
}
