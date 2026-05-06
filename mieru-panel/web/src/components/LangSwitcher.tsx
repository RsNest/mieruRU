import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../store/settings'
import type { Lang } from '../types'

const options: Array<{ value: Lang; label: string }> = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中文' },
]

export function LangSwitcher() {
  const { i18n } = useTranslation()
  const lang = useSettingsStore((state) => state.lang)
  const setLang = useSettingsStore((state) => state.setLang)

  const onChange = (value: Lang) => {
    setLang(value)
    void i18n.changeLanguage(value)
  }

  return (
    <div className="lang-switcher" role="group" aria-label="language switcher">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`lang-btn ${lang === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
