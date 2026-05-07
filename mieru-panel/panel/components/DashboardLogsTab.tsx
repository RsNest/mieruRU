'use client'

import { AuditPanel } from './AuditPanel'
import { LogsPanel } from './LogsPanel'

interface DashboardLogsTabProps {
  active: boolean
}

export function DashboardLogsTab({ active }: DashboardLogsTabProps) {
  return (
    <div className={`tab-pane ${active ? 'active' : 'inactive'}`}>
      <LogsPanel />
      <AuditPanel />
    </div>
  )
}
