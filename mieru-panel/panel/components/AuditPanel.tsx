'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { AuditEntry } from '@/lib/types'
import { usePollingTask } from './usePollingTask'

const POLL_MS = 15000

const ACTION_BADGE: Record<string, string> = {
  'login.ok': 'ok',
  'login.failed': 'denied',
  'login.throttled': 'denied',
  'sub.served': 'ok',
  'sub.denied': 'denied',
  'sub.invalid_token': 'denied',
  'user.create': 'ok',
  'user.delete': 'warn',
  'user.update': 'ok',
  'user.bulk_delete': 'warn',
  'user.devices_reset': 'ok',
  'mita.state': 'info',
}

export function AuditPanel() {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  const pollAudit = useCallback(async (isCancelled: () => boolean) => {
    try {
      const res = await api.getAudit(200)
      if (isCancelled()) return
      setEntries(res.entries)
    } catch {
      // soft-fail; audit log might not exist yet
    } finally {
      if (!isCancelled()) setLoaded(true)
    }
  }, [])

  usePollingTask(pollAudit, POLL_MS)

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <div>
          <h2>{t('audit_title')}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {t('audit_hint')}
          </p>
        </div>
        <span className="badge">{entries.length}</span>
      </div>

      {!loaded ? (
        <p className="muted">{t('loading')}</p>
      ) : entries.length === 0 ? (
        <p className="muted">{t('audit_empty')}</p>
      ) : (
        <div className="audit-list">
          {entries.map((entry, idx) => {
            const badge = ACTION_BADGE[entry.action] ?? 'info'
            return (
              <div key={idx} className={`audit-row ${badge}`}>
                <span className="audit-time">
                  {new Date(entry.time).toLocaleString()}
                </span>
                <span className="audit-action">{entry.action}</span>
                {entry.actor ? <span className="audit-actor">{entry.actor}</span> : null}
                {entry.target ? <span className="audit-target">→ {entry.target}</span> : null}
                {entry.ip ? <span className="audit-ip">{entry.ip}</span> : null}
                {entry.result ? <span className={`audit-result ${badge}`}>{entry.result}</span> : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
