'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { dashboardHref, parseDashboardTab } from '@/lib/dashboardTab'
import { syncThemeColorMeta } from '@/lib/syncThemeMeta'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { HeaderStatusBadge } from './HeaderStatusBadge'
import { LangSwitcher } from './LangSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dashTab = parseDashboardTab(searchParams)
  // The route key intentionally does NOT include `?tab=`. The dashboard handles
  // tab switching internally (it just reads `?tab` to highlight the right
  // section). Including search params would force AnimatePresence to unmount
  // and remount the entire page on every tab click, causing a white flash and
  // a fresh data refetch.
  const routeKey = pathname
  const { t, i18n } = useTranslation()
  const theme = useSettingsStore((state) => state.theme)
  const lang = useSettingsStore((state) => state.lang)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    syncThemeColorMeta(theme)
  }, [theme])

  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang)
  }, [lang, i18n])

  const goTab = (tab: Parameters<typeof dashboardHref>[0]) => {
    router.replace(dashboardHref(tab))
  }

  const onLogout = async () => {
    await logout()
    router.replace('/login')
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
          fontFamily: 'var(--font-noto-jp), "Noto Sans JP", serif',
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
        <Link href="/" className="nav-logo">
          <span className="nav-logo-glyph">見</span>
          <span>{t('app_title')}</span>
        </Link>
        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab ${dashTab === 'users' ? 'active' : ''}`}
            onClick={() => goTab('users')}
          >
            {t('nav_users')}
          </button>
          <button
            type="button"
            className={`nav-tab ${dashTab === 'server' ? 'active' : ''}`}
            onClick={() => goTab('server')}
          >
            {t('nav_server')}
          </button>
          <button
            type="button"
            className={`nav-tab ${dashTab === 'logs' ? 'active' : ''}`}
            onClick={() => goTab('logs')}
          >
            {t('nav_logs')}
          </button>
        </nav>
        <div className="nav-controls">
          <HeaderStatusBadge />
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
            key={routeKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-tab ${dashTab === 'users' ? 'active' : ''}`}
          onClick={() => goTab('users')}
        >
          <span className="mobile-tab-icon">👤</span>
          <span>{t('nav_users')}</span>
        </button>
        <button
          type="button"
          className={`mobile-tab ${dashTab === 'server' ? 'active' : ''}`}
          onClick={() => goTab('server')}
        >
          <span className="mobile-tab-icon">🖥</span>
          <span>{t('nav_server')}</span>
        </button>
        <button
          type="button"
          className={`mobile-tab ${dashTab === 'logs' ? 'active' : ''}`}
          onClick={() => goTab('logs')}
        >
          <span className="mobile-tab-icon">📜</span>
          <span>{t('nav_logs')}</span>
        </button>
      </nav>
    </div>
  )
}
