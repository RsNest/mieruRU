'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ServerStatus } from '@/lib/types'

const POLL_MS = 15000

/**
 * HeaderStatusBadge polls /api/status every 15s and shows the mita
 * proxy state (RUNNING / IDLE / OFFLINE) in the global navigation
 * header so the admin always knows whether the proxy accepts traffic.
 */
export function HeaderStatusBadge() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ServerStatus>('IDLE')
  const [reachable, setReachable] = useState(true)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const res = await api.getStatus()
        if (cancelled) return
        setStatus(res.status)
        setReachable(true)
      } catch {
        if (cancelled) return
        setReachable(false)
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const upper = String(status).toUpperCase()
  const running = upper.includes('RUN')
  const offline = !reachable || upper.includes('OFFLINE') || upper.includes('UNAVAILABLE')

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
