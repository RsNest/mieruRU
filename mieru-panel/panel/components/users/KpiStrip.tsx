'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

type KpiStripProps = {
  loading: boolean
  usersTotal: number
  usersActive5m: number
  todayTrafficTotal: number
  todayTrafficUsers: number
  connectionsCount: number
  connectionsLoading: boolean
  /** When false, connections KPI shows a placeholder (mita not RUNNING or data unavailable). */
  connectionsAvailable: boolean
  /** Set when a fetch/RPC error occurred while the server was expected to be up. */
  connectionsErrorMessage?: string | null
  serverStatus: string
  serverStatusSince: string | null
}

function formatBytes(bytes: number): string {
  const abs = Math.max(0, bytes)
  const gb = 1024 * 1024 * 1024
  const mb = 1024 * 1024
  const kb = 1024
  if (abs >= gb) return `${(abs / gb).toFixed(2)} GB`
  if (abs >= mb) return `${(abs / mb).toFixed(1)} MB`
  if (abs >= kb) return `${(abs / kb).toFixed(1)} KB`
  return `${abs} B`
}

function normalizeStatus(status: string): 'running' | 'offline' | 'stopped' {
  const upper = status.toUpperCase()
  if (upper.includes('RUN')) return 'running'
  if (upper.includes('OFFLINE') || upper.includes('UNAVAILABLE')) return 'offline'
  return 'stopped'
}

export function KpiStrip({
  loading,
  usersTotal,
  usersActive5m,
  todayTrafficTotal,
  todayTrafficUsers,
  connectionsCount,
  connectionsLoading,
  connectionsAvailable,
  connectionsErrorMessage = null,
  serverStatus,
  serverStatusSince,
}: KpiStripProps) {
  const { t } = useTranslation()
  const statusTone = normalizeStatus(serverStatus)
  const statusLabel = useMemo(() => {
    if (statusTone === 'running') return t('server_running')
    if (statusTone === 'offline') return t('server_offline')
    return t('server_idle')
  }, [statusTone, t])

  return (
    <div className="kpi-grid">
      <article className="kpi-card">
        <div className="kpi-label">{t('kpi.users')}</div>
        <div className={`kpi-value ${loading ? 'kpi-skeleton' : ''}`}>{loading ? '' : usersTotal}</div>
        <div className={`kpi-sub ${loading ? 'kpi-skeleton' : ''}`}>
          {loading ? '' : `${usersActive5m} ${t('kpi.users_active_suffix')}`}
        </div>
      </article>

      <article className="kpi-card">
        <div className="kpi-label">{t('kpi.today_traffic')}</div>
        <div className={`kpi-value ${loading ? 'kpi-skeleton' : ''}`}>
          {loading ? '' : formatBytes(todayTrafficTotal)}
        </div>
        <div className={`kpi-sub ${loading ? 'kpi-skeleton' : ''}`}>
          {loading ? '' : t('kpi.today_traffic_suffix', { count: todayTrafficUsers })}
        </div>
      </article>

      <article className="kpi-card">
        <div className="kpi-label">{t('kpi.connections')}</div>
        <div className={`kpi-value ${loading ? 'kpi-skeleton' : ''}`}>
          {loading
            ? ''
            : connectionsLoading && connectionsAvailable
              ? '...'
              : !connectionsAvailable
                ? '—'
                : connectionsCount}
        </div>
        <div className="kpi-sub">
          {loading ? (
            <span className="kpi-skeleton" style={{ width: 90, display: 'inline-block' }} />
          ) : !connectionsAvailable ? (
            connectionsErrorMessage ? (
              <span className="muted" title={connectionsErrorMessage}>
                {connectionsErrorMessage}
              </span>
            ) : (
              t('kpi.connections_server_stopped')
            )
          ) : connectionsCount > 0 ? (
            <span className="kpi-pulse-wrap">
              <span className="kpi-pulse-dot" aria-hidden />
              {connectionsCount}
            </span>
          ) : (
            t('kpi.connections_no_active')
          )}
        </div>
      </article>

      <article className="kpi-card">
        <div className="kpi-label">{t('kpi.server_status')}</div>
        <div className={`kpi-value status-${statusTone} ${loading ? 'kpi-skeleton' : ''}`}>
          {loading ? '' : statusLabel}
        </div>
        <div className={`kpi-sub ${loading ? 'kpi-skeleton' : ''}`}>
          {loading ? '' : serverStatusSince ? `${t('kpi.status_since')} ${serverStatusSince}` : ''}
        </div>
      </article>
    </div>
  )
}
