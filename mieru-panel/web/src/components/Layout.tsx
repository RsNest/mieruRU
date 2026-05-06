import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useSettingsStore } from '../store/settings'
import { LangSwitcher } from './LangSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const theme = useSettingsStore((state) => state.theme)
  const lang = useSettingsStore((state) => state.lang)
  const logout = useAuthStore((state) => state.logout)

  document.documentElement.setAttribute('data-theme', theme)
  if (i18n.language !== lang) {
    void i18n.changeLanguage(lang)
  }

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <div className="bg-glyph" aria-hidden="true">
        見
      </div>
      <header className="topbar">
        <div className="brand">見 {t('app_title')}</div>
        <nav className="nav-tabs">
          <Link to="/">{t('nav_users')}</Link>
          <button type="button">{t('nav_stats')}</button>
          <button type="button">{t('nav_server')}</button>
        </nav>
        <div className="topbar-controls">
          <LangSwitcher />
          <ThemeSwitcher />
          <button type="button" className="ghost-btn" onClick={() => void onLogout()}>
            {t('nav_logout')}
          </button>
        </div>
      </header>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
