'use client'

import { useTranslation } from 'react-i18next'
import type { DashboardMetricsResponse } from '@/hooks/useDashboardMetrics'

function formatUptime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatBytes(n: number): string {
  const abs = Math.max(0, n)
  const gb = 1024 ** 3
  const mb = 1024 ** 2
  if (abs >= gb) return `${(abs / gb).toFixed(2)} GB`
  if (abs >= mb) return `${(abs / mb).toFixed(1)} MB`
  return `${(abs / 1024).toFixed(1)} KB`
}

type DashboardKpiProps = {
  data: DashboardMetricsResponse | null
}

export function DashboardKpi({ data }: DashboardKpiProps) {
  const { t } = useTranslation()
  const m = data?.mita
  const panelUp = data?.panelUptimeSeconds ?? 0
  const errH = data?.errorsLastHour

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <h2>{t('dashboard.kpi_title')}</h2>
      </div>
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-value">{m != null ? m.currEstablished : '—'}</div>
          <div className="stat-label">{t('dashboard.kpi_established')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{m != null ? m.maxConn : '—'}</div>
          <div className="stat-label">{t('dashboard.kpi_max_conn')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{errH != null ? errH : '—'}</div>
          <div className="stat-label">{t('dashboard.kpi_errors_hour')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data ? formatUptime(panelUp) : '—'}</div>
          <div className="stat-label">{t('dashboard.kpi_panel_uptime')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{m != null ? formatBytes(m.downloadBytes) : '—'}</div>
          <div className="stat-label">{t('dashboard.kpi_download_total')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{m != null ? formatBytes(m.uploadBytes) : '—'}</div>
          <div className="stat-label">{t('dashboard.kpi_upload_total')}</div>
        </div>
      </div>
    </div>
  )
}
