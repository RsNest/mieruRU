import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      await login(password)
      navigate('/')
    } catch {
      setError(t('login_error'))
    }
  }

  return (
    <div className="login-screen">
      <div className="login-glyph" aria-hidden="true">
        見
      </div>
      <form className="login-card" onSubmit={onSubmit}>
        <h1>{t('login_title')}</h1>
        <input
          type="password"
          placeholder={t('login_password')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="submit" className="primary-btn">
          {t('login_btn')}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </form>
    </div>
  )
}
