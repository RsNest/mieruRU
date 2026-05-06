'use client'

import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/store/settings'
import type { Theme } from '@/lib/types'

const options: Array<{ value: Theme; icon: string; labelKey: string }> = [
  { value: 'midnight', icon: '🌙', labelKey: 'theme_midnight' },
  { value: 'sakura', icon: '◐', labelKey: 'theme_sakura' },
  { value: 'ghost', icon: '☀', labelKey: 'theme_ghost' },
]

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)

  return (
    <div className="theme-switcher" role="group" aria-label={t('theme_switcher_aria')}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`theme-btn ${theme === option.value ? 'active' : ''}`}
          onClick={() => setTheme(option.value)}
          title={t(option.labelKey)}
          aria-label={t(option.labelKey)}
          aria-pressed={theme === option.value}
        >
          {option.icon}
        </button>
      ))}
    </div>
  )
}