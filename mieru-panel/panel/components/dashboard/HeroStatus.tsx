'use client'

import { useTranslation } from 'react-i18next'
import { DaemonHeader } from '@/components/server/DaemonHeader'
import { StatusPill } from '@/components/ui/StatusPill'

type HeroStatusProps = {
  /** When dashboard metrics polling fails, show a non-blocking hint under the daemon bar. */
  metricsError?: string | null
}

export function HeroStatus({ metricsError }: HeroStatusProps) {
  const { t } = useTranslation()

  return (
    <div className="dashboard-hero-wrap">
      <DaemonHeader />
      {metricsError ? (
        <div className="dashboard-card" style={{ marginTop: 12, padding: '12px 16px' }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <span className="muted" style={{ margin: 0 }}>
              {t('dashboard.metrics_poll_hint')}
            </span>
            <StatusPill label={metricsError} tone="warn" className="daemon-chip" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
