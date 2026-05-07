'use client'

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import { useAuditPagination } from '@/hooks/useAuditPagination'
import { AuditRow } from './AuditRow'

export function AuditList() {
  const { t } = useTranslation()
  const { entries, loaded, loadMore, loadingMore, pageSize } = useAuditPagination()

  return (
    <SectionCard title={t('audit_title')} description={t('audit_hint')}>
      {!loaded ? (
        <p className="muted">{t('loading')}</p>
      ) : entries.length === 0 ? (
        <p className="muted">{t('audit_empty')}</p>
      ) : (
        <div className="audit-list-v2">
          {entries.map((entry, idx) => (
            <AuditRow key={`${entry.time}-${entry.action}-${idx}`} entry={entry} />
          ))}
        </div>
      )}
      <div className="audit-load-more">
        <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? t('loading') : t('audit_load_more', { count: pageSize })}
        </Button>
      </div>
    </SectionCard>
  )
}
