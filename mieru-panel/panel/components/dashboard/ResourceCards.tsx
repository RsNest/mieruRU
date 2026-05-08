'use client'

import { useTranslation } from 'react-i18next'
import type { DashboardMetricsResponse } from '@/hooks/useDashboardMetrics'
import { SectionCard } from '@/components/ui/SectionCard'

type ResourceCardsProps = {
  data: DashboardMetricsResponse | null
}

export function ResourceCards({ data }: ResourceCardsProps) {
  const { t } = useTranslation()
  const s = data?.system

  return (
    <SectionCard
      title={t('dashboard.resources_title', { defaultValue: 'Host resources' })}
      description={t('dashboard.resources_hint', { defaultValue: 'Live samples from the panel host.' })}
    >
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-value">{s != null ? `${s.cpuPercent.toFixed(1)}%` : '—'}</div>
          <div className="stat-label">CPU</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {s != null ? `${s.memUsedMB} / ${s.memTotalMB} MB` : '—'}
          </div>
          <div className="stat-label">{t('dashboard.mem', { defaultValue: 'Memory' })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{s != null ? `${s.netRxMbps.toFixed(2)} Mbps` : '—'}</div>
          <div className="stat-label">{t('dashboard.net_rx', { defaultValue: 'Net RX' })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{s != null ? `${s.netTxMbps.toFixed(2)} Mbps` : '—'}</div>
          <div className="stat-label">{t('dashboard.net_tx', { defaultValue: 'Net TX' })}</div>
        </div>
      </div>
    </SectionCard>
  )
}
