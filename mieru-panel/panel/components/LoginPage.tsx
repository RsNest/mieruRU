'use client'

import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { syncThemeColorMeta } from '@/lib/syncThemeMeta'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { Button } from '@/components/ui/Button'

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const theme = useSettingsStore((state) => state.theme)
  const lang = useSettingsStore((state) => state.lang)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shakeSeed, setShakeSeed] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    syncThemeColorMeta(theme)
  }, [theme])

  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang)
  }, [lang, i18n])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      await login(username.trim(), password)
      router.replace('/')
    } catch {
      setError(t('login_error'))
      setShakeSeed((v) => v + 1)
    }
  }

  return (
    <div className="login-page">
      <div className="login-backdrop" aria-hidden />
      <div className="login-glyph" aria-hidden="true">
        見
      </div>
      <motion.form
        className="login-card"
        onSubmit={onSubmit}
        animate={
          error
            ? {
                x: [0, -10, 10, -6, 6, -3, 3, 0],
                transition: { duration: 0.5 },
              }
            : { x: 0 }
        }
        key={shakeSeed}
      >
        <div className="login-logo">
          <span className="login-logo-kanji">見</span>
          <div className="login-logo-title">{t('app_title')}</div>
        </div>
        <div className="field">
          <label htmlFor="username">{t('login_username')}</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder={t('login_username')}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t('login_password')}</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t('login_password')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" variant="cta" size="lg">
          {t('login_btn')}
        </Button>
        {error ? <p className="field-error">{error}</p> : null}
      </motion.form>
    </div>
  )
}
