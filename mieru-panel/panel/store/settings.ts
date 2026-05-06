import { create } from 'zustand'
import type { Lang, Theme } from '@/lib/types'

const THEME_KEY = 'mieru-panel-theme'
const LANG_KEY = 'mieru-panel-lang'

type SettingsState = {
  theme: Theme
  lang: Lang
  setTheme: (theme: Theme) => void
  setLang: (lang: Lang) => void
}

function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'midnight'
  const raw = localStorage.getItem(THEME_KEY)
  if (raw === 'midnight' || raw === 'sakura' || raw === 'ghost') {
    return raw
  }
  return 'midnight'
}

function loadLang(): Lang {
  if (typeof window === 'undefined') return 'ru'
  const raw = localStorage.getItem(LANG_KEY)
  if (raw === 'ru' || raw === 'en' || raw === 'zh') {
    return raw
  }
  return 'ru'
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: loadTheme(),
  lang: loadLang(),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    set({ theme })
  },
  setLang: (lang) => {
    localStorage.setItem(LANG_KEY, lang)
    set({ lang })
  },
}))