'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ServerStatus as ServerStatusValue } from '@/lib/types'
import { useServerStatusStore } from '@/store/serverStatus'
import { useToast } from './useToast'

export function ServerStatus() {
  const { t } = useTranslation()
  const { error } = useToast()
  const status = useServerStatusStore((state) => state.status)
  const refresh = useServerStatusStore((state) => state.refresh)
  const startPolling = useServerStatusStore((state) => state.startPolling)
  const stopPolling = useServerStatusStore((state) => state.stopPolling)
  const setOptimistic = useServerStatusStore((state) => state.setOptimistic)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    startPolling()
    return () => stopPolling()
  }, [startPolling, stopPolling])

  const upper = String(status).toUpperCase()
  const running = upper.includes('RUN')
  const offline = upper.includes('OFFLINE') || upper.includes('UNAVAILABLE')

  const updateOptimistic = async (next: ServerStatusValue, call: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    const prev = status as ServerStatusValue
    setOptimistic(next, 5000)
    try {
      await call()
      await refresh()
    } catch (err) {
      setOptimistic(prev, 0)
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