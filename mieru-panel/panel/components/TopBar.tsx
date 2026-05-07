'use client'

import { useEffect } from 'react'
import { Menu } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { isServerRunning } from '@/lib/serverStatus'
import { useAuthStore } from '@/store/auth'
import { useServerStatusStore } from '@/store/serverStatus'
import { useUIStore } from '@/store/ui'

const breadcrumbByPath: Record<string, 'topbar_breadcrumb_users' | 'topbar_breadcrumb_server' | 'topbar_breadcrumb_logs'> =
  {
    '/users': 'topbar_breadcrumb_users',
    '/server': 'topbar_breadcrumb_server',
    '/logs': 'topbar_breadcrumb_logs',
  }

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen)
  const logout = useAuthStore((state) => state.logout)
  const status = useServerStatusStore((state) => state.status)
  const startStatusPolling = useServerStatusStore((state) => state.startPolling)
  const stopStatusPolling = useServerStatusStore((state) => state.stopPolling)

  useEffect(() => {
    startStatusPolling()
    return () => stopStatusPolling()
  }, [startStatusPolling, stopStatusPolling])

  const titleKey = breadcrumbByPath[pathname] ?? 'topbar_breadcrumb_users'
  const running = isServerRunning(status)
  const statusLabel = running ? t('status_running') : t('status_stopped')

  const onLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="v2-topbar">
      <div className="v2-topbar-left">
        <button
          type="button"
          className="v2-icon-btn v2-mobile-only"
          aria-label={t('mobile_menu_open')}
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>
        <div>
          <div className="v2-page-title">{t(titleKey)}</div>
          <div className="v2-breadcrumbs">
            {t('topbar_breadcrumb_home')} / {t(titleKey)}
          </div>
        </div>
      </div>
      <div className="v2-topbar-right">
        <span className={`v2-status-pill ${running ? 'ok' : 'stopped'}`}>{statusLabel}</span>
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
