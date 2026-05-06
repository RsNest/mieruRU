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
  onRetry: () => void
  onDelete: (name: string) => void
  onRegen: (name: string) => Promise<string>
  onAdd: () => void
}

export function UserTable({ users, loading, error, onRetry, onDelete, onRegen, onAdd }: UserTableProps) {
  const { t } = useTranslation()
  const { success, error: toastError } = useToast()
  const [openName, setOpenName] = useState<string | null>(null)
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({})

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
    return (
      <div className="table-state">
        <p>{t('users_empty')}</p>
        <button type="button" className="primary-btn" onClick={onAdd}>
          + {t('users_add')}
        </button>
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

  return (
    <div className="user-table">
      <div className="user-table-head">
        <span>{t('users_col_name')}</span>
        <span>{t('users_col_quota_day')}</span>
        <span>{t('users_col_quota_month')}</span>
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
                onToggleOpen={() => setOpenName((current) => (current === user.name ? null : user.name))}
                onDelete={onDelete}
                onRegen={handleRegen}
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