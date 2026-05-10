'use client'

import { useEffect } from 'react'
import { Menu, ScrollText } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { isServerRunning } from '@/lib/serverStatus'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/StatusPill'
import { useAuthStore } from '@/store/auth'
import { useServerStatusStore } from '@/store/serverStatus'
import { useUIStore } from '@/store/ui'

type BreadcrumbKey =
  | 'topbar_breadcrumb_dashboard'
  | 'topbar_breadcrumb_users'
  | 'topbar_breadcrumb_settings'

const breadcrumbByPath: Record<string, BreadcrumbKey> = {
  '/dashboard': 'topbar_breadcrumb_dashboard',
  '/users': 'topbar_breadcrumb_users',
  '/settings': 'topbar_breadcrumb_settings',
}

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen)
  const openLogs = useUIStore((state) => state.openLogs)
  const logout = useAuthStore((state) => state.logout)
  const status = useServerStatusStore((state) => state.status)
  const startStatusPolling = useServerStatusStore((state) => state.startPolling)
  const stopStatusPolling = useServerStatusStore((state) => state.stopPolling)

  useEffect(() => {
    startStatusPolling()
    return () => stopStatusPolling()
  }, [startStatusPolling, stopStatusPolling])

  const titleKey = breadcrumbByPath[pathname] ?? 'topbar_breadcrumb_dashboard'
  const running = isServerRunning(status)
  const statusLabel = running ? t('status_running') : t('status_stopped')
  const tone = status === 'RUNNING' ? 'success' : 'neutral'

  const onLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="v2-topbar">
      <div className="v2-topbar-left">
        <Button
          type="button"
          variant="ghost"
          size="compact"
          className="v2-icon-btn v2-mobile-only"
          aria-label={t('mobile_menu_open')}
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu size={18} />
        </Button>
        <div>
          <h1 className="v2-page-title">{t(titleKey)}</h1>
          <div className="v2-breadcrumbs">
            {t('topbar_breadcrumb_home')} / {t(titleKey)}
          </div>
        </div>
      </div>
      <div className="v2-topbar-right">
        <StatusPill label={statusLabel} tone={tone} />
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={() => openLogs()}
          aria-label={t('topbar_open_logs')}
          title={t('topbar_open_logs')}
        >
          <ScrollText size={16} />
          <span className="v2-topbar-logs-label">{t('nav_logs')}</span>
        </Button>
        <details className="v2-admin-menu">
          <summary aria-label={t('topbar_admin_menu')}>A</summary>
          <div className="v2-admin-menu-popover">
            <button type="button" onClick={() => void onLogout()}>
              {t('nav_logout')}
            </button>
          </div>
        </details>
      </div>
    </header>
  )
}
