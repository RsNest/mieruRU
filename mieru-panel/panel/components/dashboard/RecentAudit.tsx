'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { AuditEntry } from '@/lib/types'
import { AuditRow } from '@/components/logs/AuditRow'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'

const FETCH_N = 40
const SHOW_N = 12

export function RecentAudit() {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setLoadError(null)
    void api
      .getAudit(FETCH_N)
      .then((r) => {
        setEntries(r.entries.slice(0, SHOW_N))
      })
      .catch((e: Error) => {
        setLoadError(e.message || 'error')
        setEntries([])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void api
      .getAudit(FETCH_N)
      .then((r) => {
        if (cancelled) return
        setEntries(r.entries.slice(0, SHOW_N))
        setLoadError(null)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setLoadError(e.message || 'error')
        setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SectionCard
      title={t('dashboard.recent_audit_title', { defaultValue: 'Recent audit' })}
      description={t('dashboard.recent_audit_hint', { defaultValue: 'Latest security-relevant events.' })}
    >
      <div className="section-head" style={{ marginBottom: 12 }}>
        <span className="muted" style={{ margin: 0 }}>
          {loading ? t('loading', { defaultValue: 'Loading…' }) : null}
          {loadError ? loadError : null}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={load} disabled={loading}>
          {t('action_refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>
      {entries.length === 0 && !loading ? (
        <p className="muted" style={{ margin: 0 }}>
          {t('dashboard.audit_empty', { defaultValue: 'No entries.' })}
        </p>
      ) : (
        <div className="audit-list-v2">
          {entries.map((e, i) => (
            <AuditRow key={`${e.time}-${e.action}-${i}`} entry={e} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}
