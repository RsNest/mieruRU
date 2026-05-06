'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/store/settings'
import type { User } from '@/lib/types'
import { formatExpiry, formatRelative } from '@/lib/relativeTime'
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
  onUpdate: (
    name: string,
    payload: { quotaDayMB?: number; quotaMonthMB?: number; expiresAt?: number },
  ) => Promise<void>
  onClearPassword: () => void
}

const avatarVars = ['--avatar-1', '--avatar-2', '--avatar-3', '--avatar-4', '--avatar-5']

// parseTrafficToBytes accepts "↓ 5.6 MiB / ↑ 2.3 MiB" (or any subset, or
// the legacy KB/MB/GB form) and returns the total in bytes. Used by the
// quota progress bars.
function parseTrafficToBytes(raw?: string): number {
  if (!raw) return 0
  const tokens = raw.match(/[\d.,]+\s*[KMG]i?B/gi)
  if (!tokens || tokens.length === 0) return 0
  return tokens.reduce((acc, tok) => {
    const numeric = Number(tok.replace(',', '.').replace(/[^\d.]/g, ''))
    if (Number.isNaN(numeric)) return acc
    const upper = tok.toUpperCase()
    if (upper.includes('GIB') || upper.includes('GB')) return acc + numeric * 1024 * 1024 * 1024
    if (upper.includes('MIB') || upper.includes('MB')) return acc + numeric * 1024 * 1024
    if (upper.includes('KIB') || upper.includes('KB')) return acc + numeric * 1024
    return acc + numeric
  }, 0)
}

export function UserRow({
  user,
  open,
  subUrl,
  newPassword,
  onToggleOpen,
  onDelete,
  onRegen,
  onUpdate,
  onClearPassword,
}: UserRowProps) {
  const { t } = useTranslation()
  const lang = useSettingsStore((state) => state.lang)
  const initial = user.name.slice(0, 1).toUpperCase()
  const avatarIndex = user.name.charCodeAt(0) % avatarVars.length
  const avatarColor = `var(${avatarVars[avatarIndex]})`
  const usedDay = useMemo(() => parseTrafficToBytes(user.trafficDay), [user.trafficDay])
  const usedMonth = useMemo(() => parseTrafficToBytes(user.trafficMon), [user.trafficMon])

  const lastActiveRelative = useMemo(
    () => (user.lastActive ? formatRelative(user.lastActive, lang) : ''),
    [user.lastActive, lang],
  )
  const expiresLabel = useMemo(
    () => (user.expiresAt ? formatExpiry(user.expiresAt, lang) : ''),
    [user.expiresAt, lang],
  )

  const onNameDoubleClick = async () => {
    if (!confirm(t('users_dblclick_regen_confirm', { name: user.name }))) return
    onRegen(user.name)
  }

  const editExpiry = async () => {
    const current = user.expiresAt
      ? new Date(user.expiresAt * 1000).toISOString().slice(0, 10)
      : ''
    const raw = prompt(t('users_edit_expiry_prompt'), current)
    if (raw === null) return
    if (raw.trim() === '') {
      await onUpdate(user.name, { expiresAt: 0 })
      return
    }
    const parsed = Date.parse(raw)
    if (Number.isNaN(parsed)) return
    await onUpdate(user.name, { expiresAt: Math.floor(parsed / 1000) })
  }

  const expired = !!user.expired
  const expiringSoon = !!(user.expiresAt && !expired && user.expiresAt - Date.now() / 1000 < 86400 * 3)

  return (
    <div className={`user-row-wrap ${expired ? 'is-expired' : ''}`}>
      <div className="user-row user-row-cells">
        <button type="button" className="user-avatar" style={{ background: avatarColor }}>
          {initial}
        </button>
        <div className="user-name-cell">
          <button
            type="button"
            className="name-btn user-name"
            onClick={onToggleOpen}
            onDoubleClick={() => void onNameDoubleClick()}
            title={t('users_dblclick_regen_hint')}
          >
            {user.name}
          </button>
          {user.expiresAt ? (
            <button
              type="button"
              className={`expiry-pill ${expired ? 'expired' : expiringSoon ? 'soon' : ''}`}
              onClick={() => void editExpiry()}
              title={t('users_edit_expiry_hint')}
            >
              {expired ? t('users_expired') : expiresLabel}
            </button>
          ) : (
            <button
              type="button"
              className="expiry-pill ghost"
              onClick={() => void editExpiry()}
              title={t('users_edit_expiry_hint')}
            >
              ∞
            </button>
          )}
        </div>
        <QuotaBar usedBytes={usedDay} quotaMB={user.quotaDayMB} />
        <div className="col-month">
          <QuotaBar usedBytes={usedMonth} quotaMB={user.quotaMonMB} />
        </div>
        <div className="col-lastactive">
          {lastActiveRelative ? (
            <span className="muted-mono" title={user.lastActive}>
              {lastActiveRelative}
            </span>
          ) : (
            <span className="muted-mono">—</span>
          )}
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="action-btn"
            onClick={onToggleOpen}
            title={t('users_action_sub')}
          >
            <span className="hide-mobile">{t('users_action_sub')}</span>
            <span aria-hidden="true">{open ? '↑' : '↓'}</span>
          </button>
          <button
            type="button"
            className="action-btn icon-only"
            onClick={() => onRegen(user.name)}
            title={t('users_action_regen')}
            aria-label={t('users_action_regen')}
          >
            ↺
          </button>
          <button
            type="button"
            className="action-btn icon-only danger"
            onClick={() => onDelete(user.name)}
            title={t('users_action_delete')}
            aria-label={t('users_action_delete')}
          >
            ✕
          </button>
        </div>
      </div>
      <SubPanel
        open={open}
        userName={user.name}
        subUrl={subUrl}
        newPassword={newPassword}
        onClearPassword={onClearPassword}
      />
    </div>
  )
}
