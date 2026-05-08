'use client'

import { useTranslation } from 'react-i18next'
import type { DashboardMetricsResponse } from '@/hooks/useDashboardMetrics'
import { SectionCard } from '@/components/ui/SectionCard'

type MitaInternalsProps = {
  data: DashboardMetricsResponse | null
}

export function MitaInternals({ data }: MitaInternalsProps) {
  const { t } = useTranslation()
  const m = data?.mita

  const rows: { k: string; v: string }[] =
    m == null
      ? []
      : [
          { k: 'version', v: m.version || '—' },
          { k: 'uptimeSeconds', v: String(m.uptimeSeconds) },
          { k: 'directDecrypt', v: String(m.directDecrypt) },
          { k: 'failedDecrypt', v: String(m.failedDecrypt) },
          { k: 'iterateDecrypt', v: String(m.iterateDecrypt) },
          { k: 'activeOpens', v: String(m.activeOpens) },
          { k: 'passiveOpens', v: String(m.passiveOpens) },
          { k: 'currEstablished', v: String(m.currEstablished) },
          { k: 'maxConn', v: String(m.maxConn) },
        ]

  return (
    <SectionCard
      title={t('dashboard.mita_internals_title', { defaultValue: 'mita metrics' })}
      description={t('dashboard.mita_internals_hint', { defaultValue: 'Values from daemon metrics JSON.' })}
    >
      {rows.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {t('dashboard.mita_waiting', { defaultValue: 'Waiting for metrics…' })}
        </p>
      ) : (
        <dl style={{ display: 'grid', gap: 8, margin: 0 }}>
          {rows.map((row) => (
            <div
              key={row.k}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 12,
                alignItems: 'baseline',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
              }}
            >
              <dt style={{ margin: 0, color: 'var(--color-text-muted)' }}>{row.k}</dt>
              <dd style={{ margin: 0, textAlign: 'right', wordBreak: 'break-all' }}>{row.v}</dd>
            </div>
          ))}
        </dl>
      )}
    </SectionCard>
  )
}
