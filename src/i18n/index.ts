import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { en } from './locales/en'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false, // React handles escaping
  },
})

// Type augmentation — makes t() fully type-checked against the en locale
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof en
    }
  }
}

export default i18n
