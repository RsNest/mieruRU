import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import type { ServerStatus as ServerStatusValue } from '../types'
import { useToast } from './useToast'

interface ServerStatusProps {
  initialStatus: ServerStatusValue
  onStatusChange: (next: ServerStatusValue) => void
}

export function ServerStatus({ initialStatus, onStatusChange }: ServerStatusProps) {
  const { t } = useTranslation()
  const { error } = useToast()
  const [status, setStatus] = useState<ServerStatusValue>(initialStatus)

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  useEffect(() => {
    const tick = async () => {
      try {
        const res = await api.getStatus()
        setStatus(res.status)
        onStatusChange(res.status)
      } catch {
        // ignore transient polling errors
      }
    }
    const id = window.setInterval(() => void tick(), 30000)
    return () => window.clearInterval(id)
  }, [onStatusChange])

  const running = String(status).toUpperCase().includes('RUN')

  const updateOptimistic = async (next: ServerStatusValue, call: () => Promise<unknown>) => {
    const prev = status
    setStatus(next)
    onStatusChange(next)
    try {
      await call()
    } catch {
      setStatus(prev)
      onStatusChange(prev)
      error(t('toast_error'))
    }
  }

  return (
    <div className="server-status-card">
      <h3>{t('server_section_title')}</h3>
      <div className="server-row">
        <span className={running ? 'status-dot-running' : 'status-dot-idle'} />
        <strong>{running ? t('server_running') : t('server_idle')}</strong>
      </div>
      <div className="server-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={() => void updateOptimistic('RUNNING', () => api.startServer())}
        >
          {t('server_start')}
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => void updateOptimistic('IDLE', () => api.stopServer())}
        >
          {t('server_stop')}
        </button>
      </div>
    </div>
  )
}
