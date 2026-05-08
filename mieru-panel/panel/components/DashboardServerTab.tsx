'use client'

import { motion } from 'framer-motion'
import { AdminCredentialsPanel } from './AdminCredentialsPanel'
import { AdvancedSettingsPanel } from './AdvancedSettingsPanel'
import { ConfigBackupPanel } from './ConfigBackupPanel'
import { ConnectionsPanel } from './ConnectionsPanel'
import { ServerConfigPanel } from './ServerConfigPanel'
import { SubSecurityPanel } from './SubSecurityPanel'
import { DaemonHeader } from '@/components/server/DaemonHeader'

interface DashboardServerTabProps {
  active: boolean
  onRestored: () => void
}

export function DashboardServerTab({ active, onRestored }: DashboardServerTabProps) {
  return (
    <div className={`tab-pane ${active ? 'active' : 'inactive'}`}>
      <DaemonHeader />
      <ConnectionsPanel active={active} compact />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
        <AdminCredentialsPanel />
      </motion.div>
      <div className="server-section-grid">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0 }}>
          <ServerConfigPanel />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.03 }}>
          <AdvancedSettingsPanel />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.06 }}>
          <SubSecurityPanel />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.09 }}>
          <ConfigBackupPanel onRestored={onRestored} />
        </motion.div>
      </div>
    </div>
  )
}
