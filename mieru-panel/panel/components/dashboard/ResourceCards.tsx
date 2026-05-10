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
      title={t('dashboard.resources_title')}
      description={t('dashboard.resources_hint')}
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
          <div className="stat-label">{t('dashboard.mem')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{s != null ? `${s.netRxMbps.toFixed(2)} Mbps` : '—'}</div>
          <div className="stat-label">{t('dashboard.net_rx')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{s != null ? `${s.netTxMbps.toFixed(2)} Mbps` : '—'}</div>
          <div className="stat-label">{t('dashboard.net_tx')}</div>
        </div>
      </div>
    </SectionCard>
  )
}
