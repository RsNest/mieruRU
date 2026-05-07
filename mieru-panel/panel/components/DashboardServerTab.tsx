'use client'

import { AdminCredentialsPanel } from './AdminCredentialsPanel'
import { AdvancedSettingsPanel } from './AdvancedSettingsPanel'
import { ConfigBackupPanel } from './ConfigBackupPanel'
import { ConnectionsPanel } from './ConnectionsPanel'
import { ServerConfigPanel } from './ServerConfigPanel'
import { ServerStatus } from './ServerStatus'
import { SubSecurityPanel } from './SubSecurityPanel'

interface DashboardServerTabProps {
  active: boolean
  onRestored: () => void
}

export function DashboardServerTab({ active, onRestored }: DashboardServerTabProps) {
  return (
    <div className={`tab-pane ${active ? 'active' : 'inactive'}`}>
      <div className="dashboard-card">
        <ServerStatus />
      </div>
      <ConnectionsPanel active={active} />
      <ServerConfigPanel />
      <AdvancedSettingsPanel />
      <SubSecurityPanel />
      <ConfigBackupPanel onRestored={onRestored} />
      <AdminCredentialsPanel />
    </div>
  )
}
