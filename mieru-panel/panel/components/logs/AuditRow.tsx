'use client'

import type { AuditEntry } from '@/lib/types'

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
  'mita.state': 'running',
}

export function AuditRow({ entry }: { entry: AuditEntry }) {
  const tone = ACTION_BADGE[entry.action] ?? 'running'
  return (
    <div className={`audit-row-v2 ${tone}`}>
      <span className="audit-time-v2">{new Date(entry.time).toLocaleString()}</span>
      <span className="audit-action-v2">{entry.action}</span>
      <span className="audit-meta-v2">{entry.actor || '-'}</span>
      <span className="audit-meta-v2">{entry.ip || '-'}</span>
      <span className={`audit-result-v2 ${tone}`}>{entry.result || tone.toUpperCase()}</span>
    </div>
  )
}
