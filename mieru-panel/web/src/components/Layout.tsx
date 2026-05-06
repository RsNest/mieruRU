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
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: '-4%',
          right: '-1%',
          fontSize: 'clamp(260px, 38vw, 520px)',
          color: 'var(--accent)',
          opacity: 'var(--glyph-opacity)',
          fontFamily: '"Noto Sans JP", serif',
          fontWeight: 300,
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        見
      </div>
      <header className="nav">
        <Link to="/" className="nav-logo">
          <span className="nav-logo-glyph">見</span>
          <span>{t('app_title')}</span>
        </Link>
        <nav className="nav-tabs">
          <button type="button" className="nav-tab active">
            {t('nav_users')}
          </button>
          <button type="button" className="nav-tab">
            {t('nav_stats')}
          </button>
          <button type="button" className="nav-tab">
            {t('nav_server')}
          </button>
        </nav>
        <div className="nav-controls">
          <LangSwitcher />
          <ThemeSwitcher />
          <button type="button" className="btn-secondary" onClick={() => void onLogout()}>
            {t('nav_logout')}
          </button>
        </div>
      </header>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="mobile-bottom-nav">
        <button type="button" className="mobile-tab active">
          <span className="mobile-tab-icon">👤</span>
          <span>{t('nav_users')}</span>
        </button>
        <button type="button" className="mobile-tab">
          <span className="mobile-tab-icon">📊</span>
          <span>{t('nav_stats')}</span>
        </button>
        <button type="button" className="mobile-tab">
          <span className="mobile-tab-icon">🖥</span>
          <span>{t('nav_server')}</span>
        </button>
      </nav>
    </div>
  )
}
