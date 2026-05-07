'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isServerOffline, isServerRunning } from '@/lib/serverStatus'
import { useServerStatusStore } from '@/store/serverStatus'

/**
 * HeaderStatusBadge polls /api/status every 15s and shows the mita
 * proxy state (RUNNING / IDLE / OFFLINE) in the global navigation
 * header so the admin always knows whether the proxy accepts traffic.
 */
export function HeaderStatusBadge() {
  const { t } = useTranslation()
  const status = useServerStatusStore((state) => state.status)
  const reachable = useServerStatusStore((state) => state.reachable)
  const startPolling = useServerStatusStore((state) => state.startPolling)
  const stopPolling = useServerStatusStore((state) => state.stopPolling)

  useEffect(() => {
    startPolling()
    return () => {
      stopPolling()
    }
  }, [startPolling, stopPolling])

  const running = isServerRunning(status)
  const offline = isServerOffline(status, reachable)

  let label: string
  let cls: string
  if (running) {
    label = t('server_running')
    cls = 'header-status running'
  } else if (offline) {
    label = t('server_offline')
    cls = 'header-status offline'
  } else {
    label = t('server_idle')
    cls = 'header-status idle'
  }

  return (
    <div className={cls} title={t('header_status_aria')} aria-live="polite">
      <span className="header-status-dot" />
      <span className="header-status-label">{label}</span>
    </div>
  )
}
