'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { syncThemeColorMeta } from '@/lib/syncThemeMeta'
import { useSettingsStore } from '@/store/settings'
import { useUIStore } from '@/store/ui'
import { LogsDrawer } from '@/components/logs/LogsDrawer'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function LayoutV2({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { i18n, t } = useTranslation()
  const theme = useSettingsStore((state) => state.theme)
  const lang = useSettingsStore((state) => state.lang)
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen)
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen)

  useEffect(() => {
    const apply = (effective: typeof theme) => {
      document.documentElement.setAttribute('data-theme', effective)
      syncThemeColorMeta(effective)
    }
    if (theme !== 'auto') {
      apply(theme)
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const reflect = () => apply(mq.matches ? 'midnight' : 'daylight')
    reflect()
    mq.addEventListener('change', reflect)
    return () => mq.removeEventListener('change', reflect)
  }, [theme])

  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang)
  }, [lang, i18n])

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  return (
    <div className="v2-shell">
      <Sidebar />
      <div className="v2-main-column">
        <TopBar />
        <main className="v2-main-content">{children}</main>
      </div>

      <LogsDrawer />

      <AnimatePresence>
        {mobileSidebarOpen ? (
          <>
            <motion.button
              type="button"
              className="v2-drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              aria-label={t('mobile_menu_close')}
            />
            <motion.div
              className="v2-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Sidebar mobile />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
