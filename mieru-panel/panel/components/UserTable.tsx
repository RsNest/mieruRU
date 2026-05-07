'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { User } from '@/lib/types'
import { ConfirmModal } from './ConfirmModal'
import { EditExpiryModal } from './EditExpiryModal'
import { UserRow } from './UserRow'
import { useUserTableController } from './useUserTableController'
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
  const controller = useUserTableController({
    users,
    onRegen,
    onUpdate,
    onBulkDelete,
    t: (key, options) => t(key, options as never),
    success,
    toastError,
  })

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

  return (
    <div className="user-table">
      {controller.selected.size > 0 ? (
        <div className="bulk-bar">
          <span>{t('users_bulk_selected', { count: controller.selected.size })}</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => controller.setSelected(new Set())}
          >
            {t('confirm_no')}
          </button>
          <button
            type="button"
            className="btn-secondary danger"
            onClick={() => controller.setBulkConfirmOpen(true)}
          >
            ✕ {t('users_bulk_delete')}
          </button>
        </div>
      ) : null}
      <div className="user-table-head">
        <span aria-hidden="true" className="col-check">
          <input
            type="checkbox"
            checked={controller.allSelected}
            onChange={controller.toggleAll}
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
                open={controller.openName === user.name}
                subUrl={`${window.location.origin}/sub/${user.subToken}`}
                newPassword={controller.newPasswords[user.name] ?? null}
                selected={controller.selected.has(user.name)}
                onSelectToggle={() => controller.toggleOne(user.name)}
                onToggleOpen={() => controller.toggleOpen(user.name)}
                onDelete={onDelete}
                onRegenRequest={controller.setRegenConfirmName}
                onEditExpiryRequest={controller.openExpiryEditor}
                onUpdate={onUpdate}
                onResetDevices={onResetDevices}
                onClearPassword={() => controller.clearPassword(user.name)}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      <ConfirmModal
        open={controller.regenConfirmName !== null}
        title={t('users_action_regen')}
        message={t('users_dblclick_regen_confirm', { name: controller.regenConfirmName || '' })}
        confirmLabel={t('users_action_regen')}
        cancelLabel={t('confirm_no')}
        onConfirm={() => {
          const name = controller.regenConfirmName
          controller.setRegenConfirmName(null)
          if (name) void controller.handleRegen(name)
        }}
        onCancel={() => controller.setRegenConfirmName(null)}
      />
      <ConfirmModal
        open={controller.bulkConfirmOpen}
        title={t('users_bulk_delete')}
        message={t('users_bulk_confirm', { count: controller.selected.size })}
        confirmLabel={t('users_bulk_delete')}
        cancelLabel={t('confirm_no')}
        onConfirm={() => void controller.runBulkDelete()}
        onCancel={() => controller.setBulkConfirmOpen(false)}
      />
      <EditExpiryModal
        open={controller.expiryEditName !== null}
        currentDate={controller.expiryEditDate}
        onSubmit={controller.runEditExpiry}
        onCancel={controller.closeExpiryEditor}
      />
    </div>
  )
}
