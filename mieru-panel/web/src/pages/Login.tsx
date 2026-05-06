import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shakeSeed, setShakeSeed] = useState(0)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      await login(password)
      navigate('/')
    } catch {
      setError(t('login_error'))
      setShakeSeed((v) => v + 1)
    }
  }

  return (
    <div className="login-page">
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
          <label htmlFor="password">{t('login_password')}</label>
          <input
            id="password"
            type="password"
            placeholder={t('login_password')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">
          {t('login_btn')}
        </button>
        {error ? <p className="field-error">{error}</p> : null}
      </motion.form>
    </div>
  )
}
