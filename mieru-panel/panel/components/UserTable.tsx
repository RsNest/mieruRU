'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '@/lib/types'
import { UserRow } from './UserRow'
import { useToast } from './useToast'

interface UserTableProps {
  users: User[]
  loading: boolean
  error: boolean
  /** True when an active search filter is hiding rows. */
  searchActive?: boolean
  onClearSearch?: () => void
  onRetry: () => void
  onDelete: (name: string) => void
  onRegen: (name: string) => Promise<string>
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
  onBulkDelete: (names: string[]) => Promise<void>
  onAdd: () => void
}

export function UserTable({
  users,
  loading,
  error,
  searchActive,
  onClearSearch,
  onRetry,
  onDelete,
  onRegen,
  onUpdate,
  onResetDevices,
  onBulkDelete,
  onAdd,
}: UserTableProps) {
  const { t } = useTranslation()
  const { success, error: toastError } = useToast()
  const [openName, setOpenName] = useState<string | null>(null)
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <div className="user-table">
        {[1, 2, 3].map((row) => (
          <div key={row} className="user-row skeleton-row">
            <div className="skeleton skeleton-circle" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="table-state">
        <p>{t('toast_error')}</p>
        <button type="button" className="ghost-btn" onClick={onRetry}>
          {t('users_retry')}
        </button>
      </div>
    )
  }

  if (users.length === 0) {
    if (searchActive) {
      return (
        <div className="table-state">
          <p>{t('users_search_no_match')}</p>
          {onClearSearch ? (
            <button type="button" className="ghost-btn" onClick={onClearSearch}>
              {t('users_search_clear')}
            </button>
          ) : null}
        </div>
      )
    }
    return (
      <div className="table-state">
        <p>{t('users_empty')}</p>
      </div>
    )
  }

  const handleRegen = async (name: string) => {
    try {
      const next = await onRegen(name)
      setNewPasswords((prev) => ({ ...prev, [name]: next }))
      success(t('toast_password_regenerated'))
      setOpenName(name)
    } catch {
      toastError(t('toast_error'))
    }
  }

  const allSelected = users.length > 0 && users.every((u) => selected.has(u.name))
  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set()
      const next = new Set(prev)
      users.forEach((u) => next.add(u.name))
      return next
    })
  }
  const toggleOne = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const runBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(t('users_bulk_confirm', { count: selected.size }))) return
    try {
      await onBulkDelete(Array.from(selected))
      setSelected(new Set())
      success(t('users_bulk_deleted', { count: selected.size }))
    } catch (e) {
      toastError((e as Error).message || t('toast_error'))
    }
  }

  return (
    <div className="user-table">
      {selected.size > 0 ? (
        <div className="bulk-bar">
          <span>{t('users_bulk_selected', { count: selected.size })}</span>
          <button type="button" className="btn-secondary" onClick={() => setSelected(new Set())}>
            {t('confirm_no')}
          </button>
          <button type="button" className="btn-secondary danger" onClick={() => void runBulkDelete()}>
            ✕ {t('users_bulk_delete')}
          </button>
        </div>
      ) : null}
      <div className="user-table-head">
        <span aria-hidden="true" className="col-check">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label={t('users_select_all')}
          />
        </span>
        <span>{t('users_col_name')}</span>
        <span>{t('users_col_quota_day')}</span>
        <span>{t('users_col_quota_month')}</span>
        <span>{t('users_col_lastactive')}</span>
        <span>{t('users_col_actions')}</span>
      </div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key="users-list"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
          }}
          initial="initial"
          animate="animate"
        >
          {users.map((user) => (
            <motion.div
              key={user.name}
              variants={{
                initial: { opacity: 0, x: -12 },
                animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
              }}
              exit={{ opacity: 0, x: 10 }}
            >
              <UserRow
                user={user}
                open={openName === user.name}
                subUrl={`${window.location.origin}/sub/${user.subToken}`}
                newPassword={newPasswords[user.name] ?? null}
                selected={selected.has(user.name)}
                onSelectToggle={() => toggleOne(user.name)}
                onToggleOpen={() => setOpenName((current) => (current === user.name ? null : user.name))}
                onDelete={onDelete}
                onRegen={handleRegen}
                onUpdate={onUpdate}
                onResetDevices={onResetDevices}
                onClearPassword={() =>
                  setNewPasswords((prev) => {
                    const next = { ...prev }
                    delete next[user.name]
                    return next
                  })
                }
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}