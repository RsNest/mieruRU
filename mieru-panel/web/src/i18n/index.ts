import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { ru } from './ru'
import { zh } from './zh'

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: 'ru',
  fallbackLng: false,
  interpolation: { escapeValue: false },
})

export default i18n
