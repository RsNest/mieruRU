'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ServerStatus as ServerStatusValue } from '@/lib/types'
import { useToast } from './useToast'

interface ServerStatusProps {
  initialStatus: ServerStatusValue
  onStatusChange: (next: ServerStatusValue) => void
}

export function ServerStatus({ initialStatus, onStatusChange }: ServerStatusProps) {
  const { t } = useTranslation()
  const { error } = useToast()
  const [status, setStatus] = useState<ServerStatusValue>(initialStatus)
  const [busy, setBusy] = useState(false)
  // Timestamp (ms) until which background polling should ignore the
  // server-reported status. After a click we trust the optimistic value
  // long enough for the daemon to actually transition.
  const suppressPollUntilRef = useRef<number>(0)

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  useEffect(() => {
    const tick = async () => {
      if (Date.now() < suppressPollUntilRef.current) return
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

  const upper = String(status).toUpperCase()
  const running = upper.includes('RUN')
  const offline = upper.includes('OFFLINE') || upper.includes('UNAVAILABLE')

  const updateOptimistic = async (next: ServerStatusValue, call: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    suppressPollUntilRef.current = Date.now() + 5000
    const prev = status
    setStatus(next)
    onStatusChange(next)
    try {
      await call()
    } catch (err) {
      setStatus(prev)
      onStatusChange(prev)
      const msg = (err as Error)?.message
      error(msg && msg.trim() !== '' ? msg : t('toast_error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="server-status-card">
      <h3 className="modal-title">{t('server_section_title')}</h3>
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div
          className={running ? 'status-dot-running' : 'status-dot-idle'}
          style={{ width: 16, height: 16, margin: '0 auto 16px' }}
        />
        <div
          className="mono"
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: running
              ? 'var(--success)'
              : offline
                ? 'var(--danger, #f87171)'
                : 'var(--text-muted)',
            marginBottom: 8,
          }}
        >
          {running ? t('server_running') : offline ? t('server_offline') : t('server_idle')}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>mita · 見た</div>
      </div>
      <div className="server-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={busy || running}
          onClick={() => void updateOptimistic('RUNNING', () => api.startServer())}
        >
          {t('server_start')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || (!running && !offline)}
          onClick={() => void updateOptimistic('IDLE', () => api.stopServer())}
        >
          {t('server_stop')}
        </button>
      </div>
    </div>
  )
}