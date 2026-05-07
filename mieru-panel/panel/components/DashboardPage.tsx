'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { dashboardHref, parseDashboardTab } from '@/lib/dashboardTab'
import { parseTrafficToMB } from '@/lib/traffic'
import type { User } from '@/lib/types'
import { useServerStatusStore } from '@/store/serverStatus'
import { AddUserModal } from './AddUserModal'
import { ConfirmModal } from './ConfirmModal'
import { DashboardLogsTab } from './DashboardLogsTab'
import { DashboardServerTab } from './DashboardServerTab'
import { DashboardUsersTab } from './DashboardUsersTab'
import { StatCard } from './StatCard'
import { Toasts } from './Toast'
import { useToast } from './useToast'

type BarRow = {
  name: string
  fullName: string
  trafficMB: number
  displayDay: string
  displayMon: string
}

export function DashboardPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error } = useToast()
  const tab = parseDashboardTab(searchParams)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const status = useServerStatusStore((state) => state.status)
  const startStatusPolling = useServerStatusStore((state) => state.startPolling)
  const stopStatusPolling = useServerStatusStore((state) => state.stopPolling)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteName, setDeleteName] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState('var(--color-accent)')
  const [search, setSearch] = useState('')

  const fetchData = async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const usersResp = await api.getUsers()
      setUsers(usersResp.users)
      setHasError(false)
    } catch {
      if (initial) setHasError(true)
    } finally {
      if (initial) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData(true)
    const id = window.setInterval(() => {
      void fetchData(false)
    }, 15000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    startStatusPolling()
    return () => stopStatusPolling()
  }, [startStatusPolling, stopStatusPolling])

  useEffect(() => {
    const readAccent = () => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()
      if (accent) setAccentColor(accent)
    }
    readAccent()
    const observer = new MutationObserver(readAccent)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const totalTrafficTodayMB = useMemo(
    () => users.reduce((sum, user) => sum + parseTrafficToMB(user.trafficDay), 0),
    [users],
  )

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q))
  }, [users, search])

  const barData: BarRow[] = useMemo(() => {
    return [...users]
      .map((u) => ({
        fullName: u.name,
        name: u.name.length > 14 ? `${u.name.slice(0, 12)}…` : u.name,
        trafficMB: Math.round(parseTrafficToMB(u.trafficDay) * 100) / 100,
        displayDay: u.trafficDay || '-',
        displayMon: u.trafficMon || '-',
      }))
      .sort((a, b) => b.trafficMB - a.trafficMB)
  }, [users])

  const totalTrafficLabel =
    totalTrafficTodayMB >= 1024
      ? `${(totalTrafficTodayMB / 1024).toFixed(2)} ${t('unit_gb')}`
      : `${totalTrafficTodayMB.toFixed(1)} ${t('unit_mb')}`
  const upperStatus = String(status).toUpperCase()
  const statusLabel = upperStatus.includes('RUN')
    ? t('server_running')
    : upperStatus.includes('OFFLINE') || upperStatus.includes('UNAVAILABLE')
      ? t('server_offline')
      : t('server_idle')

  const onAddUser = async (payload: {
    name: string
    password: string
    quotaDayMB: number
    quotaMonthMB: number
    expiresAt: number
    maxDevices: number
  }) => {
    const res = await api.addUser(payload)
    success(t('toast_user_added'))
    if (res.autoStarted) success(t('toast_server_auto_started'))
    await fetchData(false)
  }

  const onDeleteUser = async () => {
    if (!deleteName) return
    try {
      await api.deleteUser(deleteName)
      success(t('toast_user_deleted'))
      setDeleteName(null)
      await fetchData(false)
    } catch {
      error(t('toast_error'))
    }
  }

  const onRegenUser = async (name: string) => {
    const response = await api.regenUser(name)
    await fetchData(false)
    return response.password
  }

  const onUpdateUser = async (
    name: string,
    payload: {
      quotaDayMB?: number
      quotaMonthMB?: number
      expiresAt?: number
      maxDevices?: number
    },
  ) => {
    await api.updateUser(name, payload)
    success(t('toast_user_updated'))
    await fetchData(false)
  }

  const onResetDevices = async (name: string, fingerprint?: string) => {
    await api.resetDevices(name, fingerprint)
    await fetchData(false)
  }

  const onBulkDelete = async (names: string[]) => {
    await api.bulkDeleteUsers(names)
    await fetchData(false)
  }

  const downloadSubscriptions = () => {
    window.location.href = api.exportSubscriptionsUrl()
  }

  // Avoid unused lint warnings while we keep `router` available for tab
  // navigation triggered elsewhere on the page.
  void router

  return (
    <section className="dashboard-stack">
      <Toasts />

      <div className="stats-grid">
        <StatCard label={t('stat_total_users')} value={users.length} accent />
        <StatCard label={t('stat_total_traffic_today')} value={totalTrafficLabel} />
        <StatCard label={t('stat_server_status')} value={statusLabel} />
      </div>

      <div className={`tabs-stack tab-${tab}`}>
      <DashboardUsersTab
        active={tab === 'users'}
        users={users}
        filteredUsers={filteredUsers}
        loading={loading}
        hasError={hasError}
        search={search}
        setSearch={setSearch}
        barData={barData}
        accentColor={accentColor}
        onShowAdd={() => setShowAdd(true)}
        onClearSearch={() => setSearch('')}
        onRetry={() => void fetchData(true)}
        onDelete={(name) => setDeleteName(name)}
        onRegen={onRegenUser}
        onUpdate={onUpdateUser}
        onResetDevices={onResetDevices}
        onBulkDelete={onBulkDelete}
        onDownloadSubscriptions={downloadSubscriptions}
      />

      <DashboardServerTab active={tab === 'server'} onRestored={() => void fetchData(false)} />
      <DashboardLogsTab active={tab === 'logs'} />
      </div>

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={onAddUser} />

      <ConfirmModal
        open={deleteName !== null}
        title={t('confirm_delete_title')}
        message={t('confirm_delete_message', { name: deleteName || '' })}
        confirmLabel={t('confirm_yes')}
        cancelLabel={t('confirm_no')}
        onConfirm={() => void onDeleteUser()}
        onCancel={() => setDeleteName(null)}
      />
    </section>
  )
}

// Re-export so other components can deep-link to a tab. dashboardHref is
// already exported from the lib but referenced here via `parseDashboardTab`
// to keep the import surface stable.
export { dashboardHref }
