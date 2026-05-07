'use client'

import { useState } from 'react'
import type { User } from '@/lib/types'

type UpdateUserPayload = {
  quotaDayMB?: number
  quotaMonthMB?: number
  expiresAt?: number
  maxDevices?: number
}

interface UserTableControllerDeps {
  users: User[]
  onRegen: (name: string) => Promise<string>
  onUpdate: (name: string, payload: UpdateUserPayload) => Promise<void>
  onBulkDelete: (names: string[]) => Promise<void>
  translate: (key: string, options?: Record<string, unknown>) => string
  success: (message: string) => void
  toastError: (message: string) => void
}

export function useUserTableController({
  users,
  onRegen,
  onUpdate,
  onBulkDelete,
  translate,
  success,
  toastError,
}: UserTableControllerDeps) {
  const [openName, setOpenName] = useState<string | null>(null)
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [regenConfirmName, setRegenConfirmName] = useState<string | null>(null)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [expiryEditName, setExpiryEditName] = useState<string | null>(null)
  const [expiryEditDate, setExpiryEditDate] = useState('')

  const allSelected = users.length > 0 && users.every((u) => selected.has(u.name))

  const handleRegen = async (name: string) => {
    try {
      const next = await onRegen(name)
      setNewPasswords((prev) => ({ ...prev, [name]: next }))
      success(translate('toast_password_regenerated'))
      setOpenName(name)
    } catch {
      toastError(translate('toast_error'))
    }
  }

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
    const count = selected.size
    try {
      await onBulkDelete(Array.from(selected))
      setSelected(new Set())
      setBulkConfirmOpen(false)
      success(translate('users_bulk_deleted', { count }))
    } catch (e) {
      toastError((e as Error).message || translate('toast_error'))
    }
  }

  const runEditExpiry = async (nextDate: string | null) => {
    if (!expiryEditName) return
    try {
      if (nextDate === null) {
        await onUpdate(expiryEditName, { expiresAt: 0 })
      } else {
        const parsed = Date.parse(nextDate)
        if (Number.isNaN(parsed)) return
        await onUpdate(expiryEditName, { expiresAt: Math.floor(parsed / 1000) })
      }
      setExpiryEditName(null)
      setExpiryEditDate('')
    } catch (e) {
      toastError((e as Error).message || translate('toast_error'))
    }
  }

  const openExpiryEditor = (name: string, expiresAt?: number) => {
    setExpiryEditName(name)
    setExpiryEditDate(expiresAt ? new Date(expiresAt * 1000).toISOString().slice(0, 10) : '')
  }

  const closeExpiryEditor = () => {
    setExpiryEditName(null)
    setExpiryEditDate('')
  }

  const clearPassword = (name: string) => {
    setNewPasswords((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const toggleOpen = (name: string) => {
    setOpenName((current) => (current === name ? null : name))
  }

  return {
    openName,
    newPasswords,
    selected,
    regenConfirmName,
    bulkConfirmOpen,
    expiryEditName,
    expiryEditDate,
    allSelected,
    setRegenConfirmName,
    setBulkConfirmOpen,
    setSelected,
    handleRegen,
    toggleAll,
    toggleOne,
    runBulkDelete,
    runEditExpiry,
    openExpiryEditor,
    closeExpiryEditor,
    clearPassword,
    toggleOpen,
  }
}
