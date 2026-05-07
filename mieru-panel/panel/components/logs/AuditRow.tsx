'use client'

import type { AuditEntry } from '@/lib/types'
import { StatusPill } from '@/components/ui/StatusPill'

const ACTION_BADGE: Record<string, 'success' | 'warn' | 'danger' | 'neutral'> = {
  'login.ok': 'success',
  'login.failed': 'danger',
  'login.throttled': 'danger',
  'sub.served': 'success',
  'sub.denied': 'danger',
  'sub.invalid_token': 'danger',
  'user.create': 'success',
  'user.delete': 'warn',
  'user.update': 'success',
  'user.bulk_delete': 'warn',
  'user.devices_reset': 'success',
  'mita.state': 'neutral',
}

export function AuditRow({ entry }: { entry: AuditEntry }) {
  const tone = ACTION_BADGE[entry.action] ?? 'neutral'
  return (
    <div className={`audit-row-v2 ${tone}`}>
      <span className="audit-time-v2">{new Date(entry.time).toLocaleString()}</span>
      <span className="audit-action-v2">{entry.action}</span>
      <span className="audit-meta-v2">{entry.actor || '-'}</span>
      <span className="audit-meta-v2">{entry.ip || '-'}</span>
      <StatusPill
        label={entry.result || tone.toUpperCase()}
        tone={tone}
        className="audit-result-v2"
      />
    </div>
  )
}
