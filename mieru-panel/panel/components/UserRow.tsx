'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@/lib/types'
import { QuotaBar } from './QuotaBar'
import { SubPanel } from './SubPanel'

interface UserRowProps {
  user: User
  open: boolean
  subUrl: string
  newPassword: string | null
  onToggleOpen: () => void
  onDelete: (name: string) => void
  onRegen: (name: string) => void
  onClearPassword: () => void
}

const avatarVars = ['--avatar-1', '--avatar-2', '--avatar-3', '--avatar-4', '--avatar-5']

function parseTrafficToBytes(raw?: string): number {
  if (!raw) return 0
  const value = Number(raw.replace(',', '.').replace(/[^\d.]/g, ''))
  if (Number.isNaN(value)) return 0
  const up = raw.toUpperCase()
  if (up.includes('GB')) return value * 1024 * 1024 * 1024
  if (up.includes('MB')) return value * 1024 * 1024
  if (up.includes('KB')) return value * 1024
  return value
}

export function UserRow({
  user,
  open,
  subUrl,
  newPassword,
  onToggleOpen,
  onDelete,
  onRegen,
  onClearPassword,
}: UserRowProps) {
  const { t } = useTranslation()
  const initial = user.name.slice(0, 1).toUpperCase()
  const avatarIndex = user.name.charCodeAt(0) % avatarVars.length
  const avatarColor = `var(${avatarVars[avatarIndex]})`
  const usedDay = useMemo(() => parseTrafficToBytes(user.trafficDay), [user.trafficDay])
  const usedMonth = useMemo(() => parseTrafficToBytes(user.trafficMon), [user.trafficMon])

  return (
    <div className="user-row-wrap">
      <div className="user-row user-row-cells">
        <button type="button" className="user-avatar" style={{ background: avatarColor }}>
          {initial}
        </button>
        <button type="button" className="name-btn user-name" onClick={onToggleOpen}>
          {user.name}
        </button>
        <QuotaBar usedBytes={usedDay} quotaMB={user.quotaDayMB} />
        <div className="col-month">
          <QuotaBar usedBytes={usedMonth} quotaMB={user.quotaMonMB} />
        </div>
        <div className="row-actions">
          <button type="button" className="action-btn" onClick={onToggleOpen}>
            {t('users_action_sub')} {open ? '↑' : '↓'}
          </button>
          <button type="button" className="action-btn" onClick={() => onRegen(user.name)}>
            ↺
          </button>
          <button type="button" className="action-btn danger" onClick={() => onDelete(user.name)}>
            ✕
          </button>
        </div>
      </div>
      <SubPanel
        open={open}
        subUrl={subUrl}
        newPassword={newPassword}
        onClearPassword={onClearPassword}
      />
    </div>
  )
}