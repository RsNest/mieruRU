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
  selected: boolean
  onSelectToggle: () => void
  onToggleOpen: () => void
  onDelete: (name: string) => void
  onRegenRequest: (name: string) => void
  onEditExpiryRequest: (name: string, expiresAt?: number) => void
  onUpdate: (
    name: string,
    payload: {
      quotaDayMB?: number
      quotaMonthMB?: number
      expiresAt?: number
      maxDevices?: number
    },
  ) => Promise<void>
  onResetDevices: (name: string, fingerprint?: string) => Promise<void>
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
  selected,
  onSelectToggle,
  onToggleOpen,
  onDelete,
  onRegenRequest,
  onEditExpiryRequest,
  onUpdate,
  onResetDevices,
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
    onRegenRequest(user.name)
  }

  const expired = !!user.expired
  const expiringSoon = !!(user.expiresAt && !expired && user.expiresAt - Date.now() / 1000 < 86400 * 3)

  const devicesCount = user.devices?.length ?? 0
  const maxDevices = user.maxDevices ?? 0

  return (
    <div className={`user-row-wrap ${expired ? 'is-expired' : ''}`}>
      <div className="user-row user-row-cells">
        <span className="col-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelectToggle}
            aria-label={t('users_select_one', { name: user.name })}
          />
        </span>
        <div className="user-name-cell">
          <div className="user-name-row">
            <span className="user-avatar" style={{ background: avatarColor }}>
              {initial}
            </span>
            <button
              type="button"
              className="name-btn user-name"
              onClick={onToggleOpen}
              onDoubleClick={() => void onNameDoubleClick()}
              title={t('users_dblclick_regen_hint')}
            >
              {user.name}
            </button>
            {maxDevices > 0 ? (
              <span
                className={`devices-pill ${devicesCount >= maxDevices ? 'full' : ''}`}
                title={t('users_devices_pill_hint')}
              >
                {devicesCount}/{maxDevices}
              </span>
            ) : devicesCount > 0 ? (
              <span className="devices-pill ghost" title={t('users_devices_pill_hint')}>
                {devicesCount}
              </span>
            ) : null}
          </div>
          {user.expiresAt ? (
            <button
              type="button"
              className={`expiry-pill ${expired ? 'expired' : expiringSoon ? 'soon' : ''}`}
              onClick={() => onEditExpiryRequest(user.name, user.expiresAt)}
              title={t('users_edit_expiry_hint')}
            >
              {expired ? t('users_expired') : expiresLabel}
            </button>
          ) : (
            <button
              type="button"
              className="expiry-pill ghost"
              onClick={() => onEditExpiryRequest(user.name, user.expiresAt)}
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
            onClick={() => onRegenRequest(user.name)}
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
        quotaDayMB={user.quotaDayMB}
        quotaMonMB={user.quotaMonMB}
        maxDevices={maxDevices}
        devices={user.devices ?? []}
        onClearPassword={onClearPassword}
        onUpdateQuotas={onUpdate}
        onResetDevices={onResetDevices}
      />
    </div>
  )
}
